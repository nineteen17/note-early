Run Dev Server

1. Open a terminal and run the following command to start the server
   npm run dev

2. Open a terminal and run the following command to start the stripe webhook server
   stripe listen --forward-to http://localhost:4000/api/v1/subscriptions/stripe-webhook
   This will generate a temporary STRIPE_WEBHOOK_SECRET that you will need to add to the .env file for local developement - Note you need to configure the real webhook and paste that into the deployment environment as a secret

3. Open a terminal and run the following command to run the tests
   npm run test
