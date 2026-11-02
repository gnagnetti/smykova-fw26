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
- The imported Smykova dashboard lives in src/smykova and is rendered by the / route; its files carry @ts-nocheck because they were written for a looser TypeScript config.
- Parse the training catalog by CSV headers with Papa Parse; derive pairing references only from catalog text, because the current catalog has no dedicated styling column.
- Share variant-specific availability calculations between the training sheet and HTML/PDF output to prevent model-wide totals being shown as color stock.
