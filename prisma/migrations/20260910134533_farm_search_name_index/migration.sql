-- CreateIndex (farm name lookup + ORDER BY name at 1L+ rows)
CREATE INDEX `Farm_name_idx` ON `Farm`(`name`);
