# Court & Rally — Badminton & Pickleball Platform

A web platform for exploring badminton and pickleball products and developing an online court-booking experience.

**GitHub Repository:** https://github.com/shopkhairo-svg/pickleball-booking-platform

## Overview

Court & Rally is a web development project focused on badminton and pickleball. The goal is to bring product browsing and court-booking functionality together in one platform.

The project uses a containerized development environment to make setup and collaboration easier.

## Project Goals

- Present badminton and pickleball products.
- Develop an online court-booking experience.
- Provide a maintainable full-stack web application.
- Support collaborative development through Git and GitHub.

> Note: The goals above describe the project direction. Refer to the current application and source code for the features that are already implemented.

## Technology Stack

- **Frontend:** React, served through Nginx
- **Backend:** Node.js and Express
- **Database:** MongoDB 7
- **Caching / Data Store:** Redis 7
- **Containerization:** Docker and Docker Compose
- **Database GUI:** MongoDB Compass
- **Version Control:** Git and GitHub

This project currently uses MongoDB and Redis in its Docker Compose environment. MySQL is not required by the documented setup.

## Project Structure

```text
pickleball-booking-platform/
├── .agents/
├── backend/
├── frontend/
├── tests/
├── docker-compose.yml
├── package.json
├── package-lock.json
├── .dockerignore
├── .gitignore
└── README.md
```

The structure above highlights the main directories and configuration files. Individual files may change as development progresses.

## Prerequisites

Install the following tools before starting the project:

- [Git](https://git-scm.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [MongoDB Compass](https://www.mongodb.com/products/tools/compass)

Make sure Docker Desktop is running before executing Docker Compose commands.

## Getting Started with Docker

### 1. Clone the repository

```bash
git clone https://github.com/shopkhairo-svg/pickleball-booking-platform.git
cd pickleball-booking-platform
```

### 2. Configure environment variables

Review the environment configuration files and examples provided in the repository.

If a required `.env` file is missing, create it from the corresponding `.env.example` file when available, then fill in the required values.

Do not commit real credentials, passwords, API keys, JWT secrets, or private OAuth credentials to GitHub.

The Google OAuth client ID may be optional for local development if Google sign-in is not being tested. Configure it if the relevant feature requires it.

### 3. Start the application

From the project root, run:

```bash
docker compose up --build -d
```

To start the existing containers later without rebuilding:

```bash
docker compose up -d
```

Check the container status:

```bash
docker compose ps
```

### 4. Access the application

With the current local Docker Compose port configuration:

| Service | Local address |
|---|---|
| Frontend | http://localhost |
| Backend | http://localhost:5001 |
| MongoDB | `mongodb://localhost:27018` |

The backend container listens on port `5000`, mapped to port `5001` on the host. The MongoDB container listens on port `27017`, mapped to port `27018` on the host.

The backend's internal MongoDB connection is:

```text
mongodb://mongo:27017/pickleball_booking
```

The hostname `mongo` is used for communication between Docker Compose services. From a desktop application such as MongoDB Compass, use `localhost:27018` instead.

The backend address above identifies the configured host and port; an API route or health endpoint depends on the backend implementation.

## Connecting MongoDB Compass

1. Start Docker Desktop.
2. Start the project using `docker compose up -d`.
3. Open MongoDB Compass.
4. Create a new connection.
5. Enter the connection string:

   ```text
   mongodb://localhost:27018
   ```

6. Click **Connect**.
7. Find the `pickleball_booking` database.

The database may not appear until the application or backend has created it and written data.

## Useful Docker Commands

Check running containers:

```bash
docker compose ps
```

View service logs:

```bash
docker compose logs
```

Follow backend logs:

```bash
docker compose logs -f backend
```

Stop the application:

```bash
docker compose down
```

The standard `docker compose down` command stops and removes the Compose containers and network. It normally preserves named volumes, so database data can remain available when the services are started again.

## Troubleshooting

### Docker Desktop is not running

Open Docker Desktop, wait until the Docker engine is ready, and retry the command.

### A port is already in use

Check whether another application is using the configured port. Stop the conflicting service or adjust the port mapping in `docker-compose.yml`.

### MongoDB Compass cannot connect

- Confirm that the MongoDB container is running.
- Check `docker compose ps`.
- Verify that port `27018` is mapped to container port `27017`.
- Use `mongodb://localhost:27018` in Compass.

### Google OAuth configuration warning

A missing Google OAuth client ID may produce a warning. Configure the appropriate environment variable if you need to test Google sign-in.

### View service logs

```bash
docker compose logs -f
```

Use the logs to identify startup errors and missing environment variables.

## Development Workflow

We use Git and GitHub to manage changes and collaborate.

1. Clone the repository.
2. Create a branch for your task.
3. Make and test your changes.
4. Commit your work with a descriptive message.
5. Push your branch to GitHub.
6. Open a Pull Request for review before merging into `main`.

Example:

```bash
git switch -c feature/your-feature
git add .
git commit -m "Describe your changes"
git push -u origin feature/your-feature
```

Avoid committing generated files, dependencies, local environment files, or credentials.

## Roadmap

Potential development areas include:

- Product browsing and product details
- Product categories and search
- Court availability and booking
- User authentication and account management
- Booking history and management
- Responsive UI improvements
- Automated testing and deployment

Roadmap items are development goals, not a guarantee that each feature is already implemented.

## Contributing

Contributions are welcome from project collaborators.

- Use descriptive branch and commit names.
- Keep changes focused on a specific task.
- Test relevant functionality before opening a Pull Request.
- Never share secrets or private credentials in commits or issues.

## License and Attribution

Check the license of the original project and all third-party components before redistributing or publishing derived code. Add the appropriate license and attribution information once the applicable permissions have been verified.

---

**Project:** Court & Rally — Badminton & Pickleball Platform  
**Repository:** https://github.com/shopkhairo-svg/pickleball-booking-platform