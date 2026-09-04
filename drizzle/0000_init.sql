CREATE TABLE "journeys" (
	"user_id" text NOT NULL,
	"id" text NOT NULL,
	"repo_id" text NOT NULL,
	"repo_display_name" text NOT NULL,
	"goal" text NOT NULL,
	"goal_label" text NOT NULL,
	"question_style" text NOT NULL,
	"created_at" bigint NOT NULL,
	"last_active_at" bigint NOT NULL,
	"learner" jsonb NOT NULL,
	CONSTRAINT "journeys_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"user_id" text NOT NULL,
	"journey_id" text NOT NULL,
	"seq" integer NOT NULL,
	"payload" jsonb NOT NULL,
	CONSTRAINT "reviews_user_id_journey_id_seq_pk" PRIMARY KEY("user_id","journey_id","seq")
);
--> statement-breakpoint
CREATE TABLE "steps" (
	"user_id" text NOT NULL,
	"journey_id" text NOT NULL,
	"seq" integer NOT NULL,
	"payload" jsonb NOT NULL,
	CONSTRAINT "steps_user_id_journey_id_seq_pk" PRIMARY KEY("user_id","journey_id","seq")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;