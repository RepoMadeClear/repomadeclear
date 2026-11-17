# Reader experience: acceptance and participant review

## What is implemented

The reader uses plain-language areas, grouped parts, collapsed technical evidence, an editable project explanation, and a manual slide presentation. The detailed map remains available. User-supplied explanations and tour order are kept separately from scans; changed or missing evidence is flagged for review.

A generic scan cannot establish the full purpose of a business. An initial explanation can therefore be incomplete. Technical staff should review the purpose and the important capabilities before presenting the map to nontechnical readers. UI wording must not imply that this review has already happened.

## Local demonstration

Open http://127.0.0.1:4194/ while the local preview server is running.

This example reads Easyplan's committed source, not demo source. Its saved example descriptions cover two manually reviewed files. They are labeled as a local source review. No Easyplan dependencies are installed or executed. The example overlay is separate from production accounts. Local edits reset on reload.

The generic unreviewed experience can be reproduced with `RMC_PREVIEW_REPOSITORY` pointing at a repository and without `RMC_PREVIEW_OVERLAY`. CLI/library/trigger entry behavior currently has fixture coverage; the scanner does not detect every framework or entry convention. Unsupported source remains accessible without a guessed business role.

## Recruit three to five nontechnical participants

Not completed: no participants have been recruited or observed. Agent/browser checks are not a substitute for this step. Use people who have not worked on the code. Do not explain the diagram before the tasks. Let a project owner verify the project-specific wording first.

Give each participant the reviewed Easyplan example and these tasks:

1. Start the guided presentation. Describe in your own words what this project includes.
2. Name two main parts and explain their responsibilities.
3. Find one connection and describe what the arrow means. Ask whether it proves the software is running or that data successfully moved.
4. Find a part whose purpose is not yet known. Ask what the participant thinks that means.
5. Return to the overview, then find the schedule-generation explanation.
6. Open the supporting evidence, then return to the same place without losing context.

Record: task completion without help, time, participant wording, misunderstood terms, accidental navigation, and whether they confused suggestions with confirmed facts. Do not score a guessed business story as correct.

Proposed acceptance criteria (recommendations, not validated outcomes): at least four of five participants complete the main tour and describe two parts without assistance; all participants recognize at least one limitation; no participant interprets a library reference as a verified live data transfer. If only three participate, record individual outcomes rather than presenting a statistically meaningful success percentage.

## Additional implementation checks

Completed locally: deterministic grouping, unknown retention, legacy overlay migration, encrypted/versioned presentation persistence, rejected unpaid/stale saves, missing/changed reference review, reattachment, layout preservation, free-preview privacy, keyboard controls, mobile width, search, slide editing/reordering, and detailed-map camera restoration.

Before production rollout: verify authenticated reader editing/reload and a real hosted rescan using a disposable authorized project. Deploy frontend and server together because overlay schema 2 cannot be handled by an older server validator. Do not silently downgrade new overlays on rollback. There is no database migration in this change.

Known limits: grouping is primarily by containing source file, not a claim that each group is a complete business capability. Long areas remain paged and searchable. A tour shows representative parts; it is not an exhaustive execution trace. There is no voice narration, PowerPoint-file export, or automatic business-impact inference. These were not part of this implementation.

## Purpose-first update (2026-11-17)

CoopLayer local preview at http://127.0.0.1:4196/ now uses its committed README and screen text, without a prepared overlay. Ask participants what the project is for, whether it connects to live utility systems, and what they can do in the demonstration. Then ask them to correct a suggestion and choose whether it belongs in the main story. Existing saved scans need a rescan for this evidence. Automated and browser verification are complete; participant review is not.
