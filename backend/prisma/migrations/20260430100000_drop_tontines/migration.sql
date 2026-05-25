-- V2.5 : suppression de la fonctionnalité Tontine (remplacée par Cotisations).
-- L'enum NotifType reste inchangé ici — il sera recréé proprement à la
-- prochaine migration (ajout AVATAR_UNLOCKED + drop TONTINE_*).

-- Nettoyage préventif des notifs orphelines liées aux tontines
DELETE FROM "Notification"
 WHERE "type" IN ('TONTINE_MEMBER_JOINED', 'TONTINE_INVITE');

-- DropForeignKey (en premier, sinon DROP TABLE échoue)
ALTER TABLE "TontineMember" DROP CONSTRAINT IF EXISTS "TontineMember_groupId_fkey";
ALTER TABLE "TontineMember" DROP CONSTRAINT IF EXISTS "TontineMember_userId_fkey";
ALTER TABLE "TontineGroup" DROP CONSTRAINT IF EXISTS "TontineGroup_ownerId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "TontineMember_groupId_userId_key";
DROP INDEX IF EXISTS "TontineMember_userId_idx";
DROP INDEX IF EXISTS "TontineGroup_inviteCode_key";
DROP INDEX IF EXISTS "TontineGroup_ownerId_idx";

-- DropTable
DROP TABLE IF EXISTS "TontineMember";
DROP TABLE IF EXISTS "TontineGroup";
