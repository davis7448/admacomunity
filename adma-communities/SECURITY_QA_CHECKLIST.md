# ADMA Communities — Security & QA Checklist

## Firestore rules smoke test

Use 3 users: Admin, Líder (with at least one community), Usuario (member).

### 1) Admin
- [ ] Can read/write `users`, `lideres`, `comunidades`, `retos`, `ventas`, `inscripciones`.
- [ ] Can create/edit/delete retos from Admin panel.
- [ ] Can edit communities (name/code/logo).

### 2) Líder
- [ ] Can create a community with logo.
- [ ] Can edit only own communities.
- [ ] Can create/edit retos only for own communities.
- [ ] Cannot delete users/admin docs.

### 3) Usuario
- [ ] Can read own profile and update own user doc.
- [ ] Can view community + logo.
- [ ] Can inscribirse a retos with own `userId`.
- [ ] Cannot write `ventas`, `comunidades`, `retos` directly.

## Retos functional checks
- [ ] Estado labels (`En curso`, `Próximo`, `Terminado`) are correct by date.
- [ ] `Inscribirme` appears only when applicable.
- [ ] Top 10 renders on desktop and mobile.
- [ ] Ranking recalc in Admin/Líder updates snapshots.

## Mobile checks
- [ ] Sidebar menu opens/closes correctly.
- [ ] Stats numbers do not overflow containers.
- [ ] Top 10 does not overlay content.

## Import checks
- [ ] Excel mapping detects `NÚMERO GUÍA` / aliases.
- [ ] `numeroGuia` is persisted in `ventas`.
- [ ] Guías stat updates after re-import.

## Notes
- Current `ventas` read is still broad for compatibility. Next hardening step: constrain reads by role + community via backend mediation.
