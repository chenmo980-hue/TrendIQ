# TrendIQ Project Rules & Automation

## Automatic GitHub Synchronization
- Whenever any code is modified, compiled, and verified, the agent **MUST ALWAYS** automatically execute `git add .`, `git commit -m "<descriptive message>"`, and `git push origin main` before completing the turn.
- Remote repository URL is configured in `.git/config` with the authenticated token.
