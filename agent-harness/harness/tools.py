"""Tools: the functions the model may call, plus their JSON schemas."""
import json
import os


def list_files(path="."):
    return "\n".join(sorted(os.listdir(path)))


def read_file(path):
    with open(path) as f:
        return f.read()


# The model never sees the Python above, only these descriptions.
# The format is OpenAI-style "function" tools, which DeepSeek accepts.
SCHEMAS = [
    {"type": "function", "function": {
        "name": "list_files",
        "description": "List the files in a directory.",
        "parameters": {"type": "object", "properties": {
            "path": {"type": "string", "description": "Directory path."}}},
    }},
    {"type": "function", "function": {
        "name": "read_file",
        "description": "Read a text file and return its contents.",
        "parameters": {"type": "object", "properties": {
            "path": {"type": "string", "description": "File path."}},
            "required": ["path"]},
    }},
]

# Maps the name the model asks for to the function that does the work.
FUNCTIONS = {"list_files": list_files, "read_file": read_file}


def run_tool(name, arguments_json):
    """Run one tool call. Errors go back to the model as text, not as crashes."""
    try:
        args = json.loads(arguments_json or "{}")
        return str(FUNCTIONS[name](**args))
    except Exception as e:
        return f"Error: {type(e).__name__}: {e}"
