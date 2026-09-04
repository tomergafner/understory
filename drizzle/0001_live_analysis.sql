CREATE TABLE "analyses" (
	"repo_id" text NOT NULL,
	"commit_sha" text NOT NULL,
	"model" jsonb NOT NULL,
	"evidence" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analyses_repo_id_commit_sha_pk" PRIMARY KEY("repo_id","commit_sha")
);
--> statement-breakpoint
ALTER TABLE "journeys" ADD COLUMN "model" jsonb;