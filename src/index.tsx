import { Detail, Action, ActionPanel, List, Icon, open, getPreferenceValues } from "@raycast/api";
import { lstatSync, readdirSync, existsSync } from "fs";
import { resolve, basename } from "path";
import { homedir } from "os";

export default function Command() {
  const { workspaceDirs, error } = loadWorkspaceDirs();
  if (error) {
    return <Detail markdown={error} />;
  }

  const projectPaths = workspaceDirs
    .map((workspace) => {
      return readdirSync(workspace).map((file) => resolve(workspace, file));
    })
    .flat();

  if (!projectPaths || projectPaths.length == 0) {
    return <WorkspaceEmptyHint workspacecDirs={workspaceDirs} />;
  }

  const items = projectPaths
    .map((path) => {
      const stat = lstatSync(path);
      return {
        title: basename(path),
        path: path,
        hide: !stat.isDirectory(),
        lastModifiedAt: stat.mtime,
      };
    })
    .filter((project) => !project.hide)
    .sort((p1, p2) => p2.lastModifiedAt.getTime() - p1.lastModifiedAt.getTime())
    .map((project) => (
      <List.Item
        key={project.path}
        title={project.title}
        icon={{ fileIcon: project.path }}
        accessories={[{ text: project.lastModifiedAt.toLocaleDateString() }]}
        actions={
          <ActionPanel>
            <OpenInVSCodeAction path={project.path} />
            <Action.ShowInFinder path={project.path} />
            <Action.OpenWith path={project.path} />
          </ActionPanel>
        }
      />
    ));

  return <List>{items}</List>;
}

function OpenInVSCodeAction(props: { path: string }) {
  return (
    <Action
      title="Open in Visual Studio Code"
      icon={Icon.Code}
      onAction={() => open(props.path, "Visual Studio Code")}
    />
  );
}

function WorkspaceEmptyHint(props: { workspacecDirs: string[] }) {
  return (
    <Detail
      markdown={
        "**No folder found in the workspace you set:**" +
        props.workspacecDirs.map((dir) => "\n\n- " + dir).join("") +
        "\n\nYou may need to check whether the workspace path is correct, and" +
        "\n\nensure that the path is an absolute path (not a relative path)."
      }
    />
  );
}

function loadWorkspaceDirs(): { workspaceDirs: string[]; error: string | undefined } {
  const preferences = getPreferenceValues();
  const raw = preferences["workspaceDirs"];
  if (!raw) {
    return {
      workspaceDirs: [],
      error: "You have not set workspace folder, please go to preference to set it.",
    };
  }

  const dirs = String(raw)
    .split(";")
    .map((d) => d.trim())
    .filter((d) => d.length > 0)
    .map((d) => {
      if (!d.startsWith("~")) {
        return d;
      }
      return resolve(homedir(), d.replace("~", "."));
    });

  for (let i = 0; i < dirs.length; i++) {
    const dir = dirs[i];
    if (!existsSync(dir)) {
      return {
        workspaceDirs: [],
        error:
          "**The follow workspace does not exist:**\n\n- " +
          dir +
          "\n\nYou may need to check whether the workspace path is correct, and" +
          "\n\nensure that the path is an absolute path (not a relative path).",
      };
    }
    const stat = lstatSync(dir);
    if (!stat.isDirectory) {
      return {
        workspaceDirs: [],
        error: "**The follow workspace is not a folder:**\n\n- " + dir,
      };
    }
  }

  return { workspaceDirs: dirs, error: undefined };
}
