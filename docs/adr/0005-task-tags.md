# 0005. Task tags

**Status:** Accepted.

Task tags provide topical context on the project board. The approved feature
supports up to five ordered text labels per task, with a 30-character limit
per label and case-insensitive uniqueness within the task.

The project uses a non-null PostgreSQL text array with an empty default. The
task row carries the labels, so anonymous reads use the same RLS conditions
as the rest of the task content. The existing owner-only mutation saves
labels and task fields in one transaction with the task version check. The
database checks the shape, length and uniqueness of stored labels. The
application trims surrounding whitespace before sending the labels.
Archived records retain their labels, and protection for system tasks
covers labels as part of the existing edit restriction.

A project-wide catalog with separate assignments would make labels
reusable and enable project-wide renames. It would also require a catalog
management workflow and read policies for both the catalog and assignments.
The approved scope is per-task editing and display. A label used on several
tasks is edited separately on each task.

Cards show the first two labels and a count when more are available. Detail
and archive views show the complete list. Filtering and configurable colors
remain outside this decision.
