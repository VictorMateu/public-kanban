# Future ideas

This document records possibilities raised during product discovery. Entries are not approved requirements, architectural decisions or authorization to implement features. See [Product requirements](product.md) for the defined product direction and current boundaries.

Before implementing an idea, propose its value, scope, alternatives, data/security impact and validation. The owner decides whether to promote it into a requirement and a scoped task. Important confirmed decisions may warrant an ADR.

## Initial system tasks or project templates

Optionally create a reusable starting set of tasks when initiating a project, such as architecture, structure or initial decisions.

Open questions:

- Which initial tasks are useful across projects?
- Should creation be optional, selectable or based on templates?
- How should task copies relate to future template changes?

No task set, template model or automatic creation behavior has been selected.

## Optional task types and derived project information

An optional task type could identify decisions, stack choices or other project information. A project-information view could derive sections from those tasks instead of maintaining duplicate plain-text content.

Open questions:

- Which types are needed and how are they selected?
- Which task content becomes project information?
- How would private tasks or comments be excluded?

The current information requirement is description, objectives and a repository link. Task types and derived views are outside the current implementation scope.

## History and development updates

Explore a combination of current-state Kanban, relevant change history and owner-written updates.

Completing an important task, reaching a milestone or releasing a version could optionally prompt the owner to write a message about the changes.

Open questions:

- Which events warrant history or an update prompt?
- Should history be recorded automatically, curated manually or both?
- How are milestones, versions and important tasks identified?
- What content is public, and how can the owner edit or hide it?

No event model, history-retention policy, release system or automatic publication behavior has been selected.

## AI-assisted update drafts

If the project evolves in that direction, an AI integration might draft change messages for the owner to review.

This remains a future possibility. No provider, dependency, external connection or data transfer has been approved. A proposal would need to cover usefulness, cost, privacy, input data and the owner's review before publication.
