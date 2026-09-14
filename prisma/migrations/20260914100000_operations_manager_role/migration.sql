-- Add OPERATIONS_MANAGER to the Role enum (HQ staff between Super Admin and Agronomist)
ALTER TABLE `User` MODIFY `role` ENUM('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'FARM_ADMIN', 'AGRONOMIST', 'FARM_OFFICER') NOT NULL;
