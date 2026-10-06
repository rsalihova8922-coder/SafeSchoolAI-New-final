<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the uploaded SafeSchool API contract in a shared browser client (`/submit_survey`, `/admin_results`, `/teacher_results`, `/psychologist_results`); the external Render service is the source of truth and no local demo records are created.
- Preserve the original 30 multilingual question texts and class lists (school fixed to №50 КЕЛЕШЕК) as imported JSON; survey answers remain the original q1–q30 numeric JSON string.
- Support interventions are stored in Cloud `support_actions` behind staff-role RLS; survey trend comes only from external risk_score and is shown separately from specialist status.
