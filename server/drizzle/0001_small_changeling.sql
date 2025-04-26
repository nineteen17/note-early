ALTER TABLE "customer_subscriptions" ALTER COLUMN "user_id" SET DATA TYPE uuid USING "user_id"::uuid;
--> statement-breakpoint
ALTER TABLE "customer_subscriptions" ADD CONSTRAINT "customer_subscriptions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;