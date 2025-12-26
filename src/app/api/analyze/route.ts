import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

interface FileInfo {
  path: string;
  relativePath: string;
  content: string;
}

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  suggestionCount?: number;
}

interface Suggestion {
  file: string;
  line: number;
  type: "artifact" | "operation" | "external_call" | "user_action" | "state_change" | "check";
  pattern: string;
  suggestion: string;
  codeSnippet?: string;
  artifactType?: string;
  checkCondition?: string;
}

const CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];
const MAX_FILE_SIZE = 100000; // 100KB
const MAX_FILES = 50;

function isCodeFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return CODE_EXTENSIONS.includes(ext);
}

function readFilesRecursively(
  dirPath: string,
  basePath: string,
  files: FileInfo[] = [],
  depth: number = 0
): FileInfo[] {
  if (depth > 10 || files.length >= MAX_FILES) return files;

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (files.length >= MAX_FILES) break;

      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);

      // Skip common non-source directories
      if (entry.isDirectory()) {
        if (
          entry.name.startsWith(".") ||
          entry.name === "node_modules" ||
          entry.name === "dist" ||
          entry.name === "build" ||
          entry.name === ".next" ||
          entry.name === "coverage"
        ) {
          continue;
        }
        readFilesRecursively(fullPath, basePath, files, depth + 1);
      } else if (entry.isFile() && isCodeFile(entry.name)) {
        try {
          const stats = fs.statSync(fullPath);
          if (stats.size <= MAX_FILE_SIZE) {
            const content = fs.readFileSync(fullPath, "utf-8");
            files.push({
              path: fullPath,
              relativePath,
              content,
            });
          }
        } catch (err) {
          console.error(`Error reading file ${fullPath}:`, err);
        }
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dirPath}:`, err);
  }

  return files;
}

function buildFileTree(basePath: string, files: FileInfo[], suggestions: Suggestion[]): FileNode {
  const suggestionsByFile = new Map<string, number>();
  for (const s of suggestions) {
    const count = suggestionsByFile.get(s.file) || 0;
    suggestionsByFile.set(s.file, count + 1);
  }

  const root: FileNode = {
    name: path.basename(basePath),
    path: basePath,
    type: "directory",
    children: [],
  };

  const nodeMap = new Map<string, FileNode>();
  nodeMap.set(basePath, root);

  // Sort files to ensure parent directories are created first
  const sortedFiles = [...files].sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  for (const file of sortedFiles) {
    const parts = file.relativePath.split(path.sep);
    let currentPath = basePath;
    let currentNode = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const newPath = path.join(currentPath, part);
      const isFile = i === parts.length - 1;

      let node = nodeMap.get(newPath);
      if (!node) {
        node = {
          name: part,
          path: newPath,
          type: isFile ? "file" : "directory",
          children: isFile ? undefined : [],
          suggestionCount: isFile ? suggestionsByFile.get(file.path) || 0 : undefined,
        };
        nodeMap.set(newPath, node);
        currentNode.children = currentNode.children || [];
        currentNode.children.push(node);
      }

      currentPath = newPath;
      currentNode = node;
    }
  }

  // Sort children: directories first, then alphabetically
  function sortChildren(node: FileNode) {
    if (node.children) {
      node.children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "directory" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortChildren);
    }
  }
  sortChildren(root);

  return root;
}

const ANALYSIS_PROMPT = `Analyze this codebase and identify instrumentation points for the World Model Monitor.
Look for these patterns and return specific, actionable suggestions:

**ARTIFACTS** - Data objects that users see or that flow through the system:
- Image processing (canvas operations, image loads, blobs)
- File uploads
- API responses
- Rendered outputs

**OPERATIONS** - Async functions that transform data:
- API calls
- Image processing functions
- Data transformations

**EXTERNAL CALLS** - Third-party services:
- AI APIs (OpenAI, Gemini, Anthropic)
- Storage (S3, Supabase)
- Other HTTP calls

**USER ACTIONS** - Event handlers:
- onClick, onSubmit, onChange
- Drag/drop handlers
- Touch/pointer events

**STATE CHANGES** - State updates:
- useState setters
- Zustand/Redux actions
- Context updates

**CHECKS** - Assertions that should be true:
- Validation before API calls
- Required properties
- Expected dimensions/formats

For each pattern found, return a JSON object with:
{
  "file": "relative/path/to/file.ts",
  "line": <line number>,
  "type": "artifact" | "operation" | "external_call" | "user_action" | "state_change" | "check",
  "pattern": "brief description of what was detected",
  "suggestion": "the complete instrumentation code to add",
  "codeSnippet": "the original code being instrumented (2-5 lines)",
  "artifactType": "if type is artifact, specify the artifact type (e.g., 'ImageData', 'APIResponse')",
  "checkCondition": "if type is check, specify what condition should be checked"
}

Return ONLY a JSON array of suggestions. No explanations, just the JSON array.
Focus on the most important and high-impact instrumentation points.
Limit to 20-30 suggestions maximum.

Example instrumentation patterns:

For artifacts:
\`\`\`typescript
const artifact = Monitor.createArtifact('ImageData', {
  width,
  height,
  source: 'canvas'
}, { derivedFrom: [parentArtifactId] });
\`\`\`

For operations:
\`\`\`typescript
async function processImage(input) {
  return Monitor.operation('processImage', async () => {
    // original code
  });
}
\`\`\`

For external calls:
\`\`\`typescript
const result = await Monitor.externalCall('OpenAI', 'chat.completions', [inputId], async () => {
  return openai.chat.completions.create({ ... });
});
\`\`\`

For checks:
\`\`\`typescript
Monitor.check('ValidInput', input != null && input.length > 0, {
  inputLength: input?.length
});
\`\`\`

For user actions:
\`\`\`typescript
const handleClick = (e) => {
  Monitor.userAction('button_click', { buttonId: 'submit' });
  // original handler code
};
\`\`\`

For state changes:
\`\`\`typescript
const setItems = (newItems) => {
  Monitor.stateChange('items', { count: newItems.length });
  _setItems(newItems);
};
\`\`\`

Here is the codebase to analyze:
`;

export async function POST(request: NextRequest) {
  try {
    const { folderPath } = await request.json();

    if (!folderPath || typeof folderPath !== "string") {
      return NextResponse.json(
        { error: "folderPath is required" },
        { status: 400 }
      );
    }

    // Normalize the path
    const normalizedPath = path.normalize(folderPath);

    // Check if path exists and is a directory
    try {
      const stats = fs.statSync(normalizedPath);
      if (!stats.isDirectory()) {
        return NextResponse.json(
          { error: "Path is not a directory" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Directory not found" },
        { status: 404 }
      );
    }

    // Read all code files
    const files = readFilesRecursively(normalizedPath, normalizedPath);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No code files found in the directory" },
        { status: 400 }
      );
    }

    // Build the prompt with file contents
    const filesContent = files
      .map(
        (f) => `
=== ${f.relativePath} ===
\`\`\`typescript
${f.content}
\`\`\`
`
      )
      .join("\n");

    const fullPrompt = ANALYSIS_PROMPT + filesContent;

    // Call Claude API
    const anthropic = new Anthropic();

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: fullPrompt,
        },
      ],
    });

    // Parse the response
    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON array from response
    let suggestions: Suggestion[] = [];
    try {
      // Try to find JSON array in the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        suggestions = parsed.map((s: Suggestion) => ({
          ...s,
          // Convert relative paths to absolute
          file: path.join(normalizedPath, s.file),
        }));
      }
    } catch (parseError) {
      console.error("Failed to parse Claude response:", parseError);
      console.error("Response was:", responseText);
      return NextResponse.json(
        { error: "Failed to parse analysis results" },
        { status: 500 }
      );
    }

    // Build file tree
    const fileTree = buildFileTree(normalizedPath, files, suggestions);

    return NextResponse.json({
      fileTree,
      suggestions,
      filesAnalyzed: files.length,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred during analysis",
      },
      { status: 500 }
    );
  }
}
