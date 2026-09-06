# Reliquary encounters milestone

Primary category: Content Expansion. Started from `work/reliquary-loadout-integration` at `1b6863e`; the completed roster is merged into local `main` at `60117cc`. Version remains v1.28.2 Loadout Polish. Scope announced before editing: system 00 identity data and focused/public regression coverage only.

The roster now contains four identities: Bell-Drowned Warden (Revenant/Warden), Siltbound Reliquary Lurker (Mireborn/Lurker), Reliquary Chain Herald (Construct/Herald), and Blackwater Bell Seer (Watcher/Seer). The first two remain intact. All four reuse existing families and roles and contain only name, family, type and lore. These roles are presentation, not new combat behavior.

Changed files: system 00; Reliquary slice smoke; public-browser Reliquary helper; boss matrix identity signature; this evidence and active roadmap. No affixes, statuses, numeric modifiers, extra random rolls, saved fields, rewards, contract changes or boss changes. Version/cache, loadouts, upgrade mechanics, routes and inactive lanes are untouched.

Verification: all 144 existing family/type combinations reach exactly the four approved identities. The slice passes 1,900 seeded numeric/save comparisons against pinned main, exact contract override controls and outside-band visuals. Full compact suite rerun: **57/57 passed, no skips**, including 36,000 boss fights and the complete public Reliquary combat/loot/return/loadout browser loop. The adjacent-normal identity hash changed as expected; every other boss matrix signature is unchanged. Updated 360px fine-pointer capture inspected; all four supported profiles passed automated geometry checks. Captures: `C:\Users\quali\Documents\ChatGPT\DungeonDex\verification-captures\roster`.

Limitations: this is encounter identity variety, not mechanical role differentiation or difficulty tuning. Physical-device issue #139 remains outstanding; the separate historical gear-comparison harness failure recorded in the integration report remains unresolved. No skip is counted as passing. The completed work is merged locally; no push, retained release package, tag, upload or version change occurred.

Next milestone: choose a coherent climax from [the concrete boss/contract options](RELIQUARY_CLIMAX_DECISION.md). Implementation waits for the owner because the requested boss identity conflicts with the absence of a boss slot in D31-D40. Both options preserve existing cadence and names.

Reviewer handoff: compare this patch with `1b6863e`; confirm the two original identities survive, all added fields are identity-only, all four choices are reachable, names normalize safely, contract overrides remain exact, and only the expected identity hash changes. Review the public browser capture and preserve physical-device/release gates.
