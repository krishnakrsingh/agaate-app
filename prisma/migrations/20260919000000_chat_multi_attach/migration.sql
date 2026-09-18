-- Phase 1.5: allow multiple photo attachments per chat message.
-- The old PRIMARY KEY (messageId) rejected a second photo with P2002.
ALTER TABLE `ChatAttachment` DROP PRIMARY KEY;
ALTER TABLE `ChatAttachment` ADD PRIMARY KEY (`messageId`, `mediaAssetId`);
CREATE INDEX `ChatAttachment_messageId_idx` ON `ChatAttachment`(`messageId`);
