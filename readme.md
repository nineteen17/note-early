# To run locally

- docker-compose -f docker-compose.dev.yml up --build
- docker-compose up -d


# To run on Prod (manually)

- ssh root@[server ip add]
- cd  opt/notearly-server  
- docker-compose up -d
# Run the compiled migration file
  docker exec -it noteearly-backend node dist/db/migrate.js

# Docker essentials
  # restart backend
  - docker-compose restart backend
  # print a env variable from the container (this example uses database url env)
  - docker exec -it noteearly-backend printenv | grep DATABASE_URL
  # Force recreate the backend container completely
  - docker-compose up -d --force-recreate backend
  # Stop all containers
    docker-compose down
  # Start all conatibers
    - docker-compose up -d