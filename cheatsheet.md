# Server & Editor Cheat Sheet

Use this as a quick reference. Copy into a file (e.g., `cheatsheet.md`) on your server or local machine.

---

## File & Directory Management

| Command           | Description                                          |
|-------------------|------------------------------------------------------|
| `ls -a`           | List **all** entries (including hidden files `.` & `..`). |
| `ls -la`          | Long listing (`-l`) of all (`-a`) entries with permissions. |
| `rm <file>`       | Remove a regular file.                               |
| `rm -r <dir>`     | Recursively remove a directory and its contents.     |
| `rm -rf <dir>`    | Force-remove a directory (no prompts).               |
| `rmdir <dir>`     | Remove an **empty** directory (fails if not empty).  |

---

## Micro Editor

| Shortcut                      | Action                                                                 |
|-------------------------------|------------------------------------------------------------------------|
| `Ctrl+S`                      | Save the current file.                                                 |
| `Ctrl+Q`                      | Quit Micro (will prompt to save if unsaved; may conflict with terminal flow control). |
| `Ctrl+E`, then `quit` + Enter | Open command bar, then `quit` to exit.                                   |

> **Tip:** Disable XON/XOFF in your shell to free up `Ctrl+S/Q`:
> ```bash
> stty -ixon
> ```

---

## Docker Compose

| Command                                                               | Description                                                                           |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------------------|
| `exit` or `Ctrl+D`                                                    | Exit from inside a container shell.                                                   |
| `Ctrl-P Ctrl-Q`                                                       | Detach from an attached container **without** stopping it.                            |
| `docker compose -f docker-compose.yaml logs -f backend`           | Stream logs (`-f`) for the `backend` service in your Compose file.                    |
| `docker-compose -f docker-compose.yaml logs -f backend`           | Same, if using the standalone `docker-compose` CLI.                                   |
| `docker compose -f docker-compose.yaml config`                    | Show the fully interpolated Compose configuration (with env vars).                    |
| `docker compose -f docker-compose.yaml exec backend env`          | Exec into `backend` and dump all environment variables to verify they’re set.         |
| `docker compose -f docker-compose.yaml run --rm backend env`      | Run a one-off `backend` container to print its vars, then remove (`--rm`) it.         |


---

