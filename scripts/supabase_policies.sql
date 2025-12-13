-- Activer RLS
alter table user_progress enable row level security;

-- Politique: un utilisateur ne peut voir que ses propres lignes
create policy "read own progress" on user_progress
  for select
  using (user_id = auth.uid());

-- Politique: un utilisateur ne peut insérer que des lignes avec son user_id
create policy "insert own progress" on user_progress
  for insert
  with check (user_id = auth.uid());

-- Politique: un utilisateur ne peut mettre à jour que ses propres lignes
create policy "update own progress" on user_progress
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Politique: un utilisateur peut supprimer uniquement ses propres lignes
create policy "delete own progress" on user_progress
  for delete
  using (user_id = auth.uid());

-- Index unique pour éviter les doublons par bulle
create unique index if not exists user_progress_unique
  on user_progress (user_id, exercise_id, index);
