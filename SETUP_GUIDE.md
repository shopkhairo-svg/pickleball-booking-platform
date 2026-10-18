# Court & Rally — Developer Setup Guide

This guide explains how to clone, run, and contribute to the Court & Rally badminton and pickleball platform.

**GitHub Repository:** https://github.com/shopkhairo-svg/pickleball-booking-platform

## 1. Prerequisites

Install the following tools:

- **Git:** https://git-scm.com/downloads
- **Docker Desktop:** https://www.docker.com/products/docker-desktop/
- **Visual Studio Code:** https://code.visualstudio.com/
- **MongoDB Compass:** https://www.mongodb.com/products/tools/compass

After installation, open Docker Desktop and wait until the Docker engine is running.

To verify Git and Docker, open a terminal and run:

```bash
git --version
docker --version
docker compose version
```

## 2. Clone the Source Code

Open a terminal in the folder where you want to store the project.

Run:

```bash
git clone https://github.com/shopkhairo-svg/pickleball-booking-platform.git
cd pickleball-booking-platform
```

Open the project in Visual Studio Code:

```bash
code .
```

If GitHub says you do not have permission to access the repository, ask the repository owner to grant you access.

## 3. Configure Environment Variables

Before starting the application, inspect the environment files and examples provided in the project.

If a required `.env` file is missing, create it using the corresponding `.env.example` file if one exists. Fill in the required values according to the project configuration.

Do not copy another developer's private credentials or commit your own `.env` files to GitHub.

The project may display a warning about `VITE_GOOGLE_CLIENT_ID` if Google OAuth has not been configured. Configure the variable if you need to test Google sign-in.

## 4. Start the Application with Docker

Make sure your terminal is in the project root, where `docker-compose.yml` is located.

Build and start the services:

```bash
docker compose up --build -d
```

Wait for the containers to start, then check their status:

```bash
docker compose ps
```

The project uses Docker Compose to run the frontend, backend, MongoDB, and Redis services.

### Local service addresses

| Service | Address |
|---|---|
| Frontend | http://localhost |
| Backend | http://localhost:5001 |
| MongoDB for Compass | `mongodb://localhost:27018` |
| MongoDB inside Docker | `mongodb://mongo:27017/pickleball_booking` |

The backend is exposed on host port `5001`, while its container listens on port `5000`.

The MongoDB container listens on port `27017` internally and is exposed on host port `27018`.

The hostname `mongo` is intended for connections from other services within the Docker Compose network. Do not use `mongo` as the hostname in MongoDB Compass on your Windows host.

## 5. Connect MongoDB Compass

1. Start Docker Desktop.
2. Start the application using `docker compose up -d`.
3. Open MongoDB Compass.
4. Create a new connection.
5. Enter the following connection string:

   ```text
   mongodb://localhost:27018
   ```

6. Click **Connect**.
7. Find the `pickleball_booking` database when it has been created.

If the connection fails, check the container status:

```bash
docker compose ps
docker compose logs mongo
```

Confirm that MongoDB is running and that host port `27018` is mapped to container port `27017`.

### Important: Local Database vs Shared Database

Each developer running this project with Docker normally has their **own local MongoDB instance and data**.

For example, records created in your local database will not automatically appear in your teammate's database.

To work with the same dataset, the team must deliberately configure a shared database or exchange a database export. Never expose a database publicly or share production credentials without appropriate access controls.

## 6. Useful Docker Commands

Check running services:

```bash
docker compose ps
```

View logs from all services:

```bash
docker compose logs
```

Follow backend logs:

```bash
docker compose logs -f backend
```

Restart services:

```bash
docker compose restart
```

Stop services:

```bash
docker compose down
```

The standard `docker compose down` command removes the Compose containers and network but normally preserves named volumes. Do not use `docker compose down -v` unless you intentionally want to remove the associated named volumes and potentially delete database data.

## 7. Collaborating with Git and GitHub

Ask the repository owner to add you as a collaborator if the repository is private or if you need write access.

Before starting a task, update your local `main` branch:

```bash
git switch main
git pull origin main
```

Create a separate branch for your work:

```bash
git switch -c feature/your-feature
```

Replace `feature/your-feature` with a meaningful branch name, such as `feature/product-list`.

After making and testing your changes:

```bash
git status
git add .
git commit -m "Describe your changes"
git push -u origin feature/your-feature
```

Then open GitHub and create a Pull Request to merge your branch into `main`.

Avoid having multiple developers directly edit and push to `main`. Using separate branches and Pull Requests makes code review and conflict resolution easier.

## 8. Troubleshooting

### Docker Desktop is not running

Open Docker Desktop and wait until the engine is ready. Then retry the Docker command.

### A port is already in use

Check whether another service is using the required port. Stop the conflicting service or coordinate a port change with the team.

### MongoDB Compass cannot connect

Verify that the MongoDB container is running and use:

```text
mongodb://localhost:27018
```

### Changes do not appear in the running application

Check that your changes were saved. Depending on the change, you may need to rebuild the services:

```bash
docker compose up --build -d
```

### Git says you do not have permission to push

Confirm that you are signed in to the correct GitHub account and have write access to the repository. For collaborative work, push your own branch rather than directly pushing to `main`.

## 9. Development Rules

- Never commit `.env` files, passwords, API keys, or private credentials.
- Do not commit unnecessary dependencies, generated build outputs, or local database files.
- Use descriptive branch names and commit messages.
- Test your changes before opening a Pull Request.
- Coordinate changes to `docker-compose.yml` and shared configuration with the team.

---

**Repository:** https://github.com/shopkhairo-svg/pickleball-booking-platform

**Default workflow:** Clone → Configure → Run Docker → Develop on a branch → Push → Open a Pull Request.