# 6. Deployment

Deploying your Django application to a production environment involves several steps to ensure it runs smoothly, securely, and efficiently. This guide will walk you through configuring your project, setting up a Virtual Machine (VM) on DigitalOcean, and configuring essential services like Docker and Nginx. Whether you're a beginner or looking to refine your deployment process, this guide provides clear explanations and step-by-step instructions.

---

## 1. Configure Project

### i. Duplicate and Rename `docker-compose.yml` for Production

To tailor your application for a production environment, create a production-specific Docker Compose configuration. This setup optimizes performance and security for live deployments.

1. **Duplicate the File:**
   ```bash
   cp backend/docker-compose.yml backend/docker-compose.prod.yml
   ```

2. **`docker-compose.prod.yml` Example:**

   ```yaml
   version: '3.8'

   services:
     nginx:
       build: ./nginx
       ports:
         - 1337:80 # Exposes Nginx on port 1337
       depends_on:
         - web
       volumes:
         - media_volume:/usr/src/djangobnb_backend/media

     web:
       build: ./djangobnb_backend
       command: gunicorn djangobnb_backend.wsgi:application --bind 0.0.0.0:8000
       volumes:
         - ./djangobnb_backend/:/usr/src/djangobnb_backend/
         - media_volume:/usr/src/djangobnb_backend/media
       expose:
         - 8000 # Exposes Gunicorn app on port 8000
       env_file:
         - ./.env.dev # Load environment variables (update for production)
       depends_on:
         - db
         - daphne

     daphne:
       build: ./djangobnb_backend
       command: daphne --bind 0.0.0.0 -p 8002 djangobnb_backend.asgi:application
       ports:
         - 8002:8002

     db:
       image: postgres:15
       volumes:
         - postgres_data:/var/lib/postgresql/data/ # Persistent database storage
       environment:
         - POSTGRES_USER=postgresuser
         - POSTGRES_PASSWORD=postgrespassword
         - POSTGRES_DB=djangobnb

   volumes:
     postgres_data:
     media_volume:
   ```

   **Service Breakdown:**
   - **Nginx:** Acts as a reverse proxy, handling incoming requests and directing them to the appropriate backend service.
   - **Web (Gunicorn):** Runs the Django application efficiently in a production environment.
   - **Daphne:** Manages asynchronous requests, such as WebSockets for real-time features.
   - **Database (PostgreSQL):** Stores all application data with persistent storage to prevent data loss.

### ii. Create and Configure the `nginx` Folder

Customize Nginx to suit your production needs by setting up its configuration files.

1. **Create the Nginx Directory:**
   ```bash
   mkdir backend/nginx
   ```

2. **Create `Dockerfile` for Nginx:**

   **File:** `backend/nginx/Dockerfile`

   ```dockerfile
   FROM nginx:1.25

   RUN rm /etc/nginx/conf.d/default.conf
   COPY nginx.conf /etc/nginx/conf.d
   ```

   **Explanation:**
   - **FROM nginx:1.25:** Uses the official Nginx image version 1.25 as the base.
   - **RUN rm ...:** Removes the default Nginx configuration to prevent conflicts.
   - **COPY nginx.conf ...:** Adds your custom Nginx configuration.

3. **Create `nginx.conf`:**

   **File:** `backend/nginx/nginx.conf`

   ```nginx
   upstream djangobnb_backend {
       server web:8000;
   }

   server {
       listen 80;

       location / {
           proxy_pass http://djangobnb_backend;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header Host $host;
           proxy_redirect off;
       }

       location /media/ {
           alias /usr/src/djangobnb_backend/media/;
       }

       location ~^/ws/ {
           proxy_pass http://127.0.0.1:8002;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   **Configuration Details:**
   - **upstream djangobnb_backend:** Defines the backend server (Django) running on port 8000.
   - **location /**: Routes all root requests to the Django application.
   - **location /media/**: Serves static media files directly via Nginx for efficiency.
   - **location ~^/ws/**: Handles WebSocket connections, forwarding them to Daphne on port 8002.

### iii. Update Django `settings.py` for Production

Adjust your Django settings to differentiate between development and production environments.

1. **Open `settings.py`:**
   ```python
   vi backend/djangobnb_backend/settings.py
   ```

2. **Key Configuration Changes:**

   ```python
   from dotenv import load_dotenv
   import os

   load_dotenv()

   DEBUG = os.getenv('DEBUG', '0') == '1'

   if DEBUG:
       ALLOWED_HOSTS = ["localhost", "127.0.0.1", "159.223.62.28"]
       WEBSITE_URL = 'http://localhost:8000'
   else:
       ALLOWED_HOSTS = ["159.223.62.28"]
       WEBSITE_URL = 'http://159.223.62.28:1337'

   CORS_ALLOWED_ORIGINS = [
       'http://127.0.0.1:8000',
       'http://127.0.0.1:3000',
       'http://159.223.62.28',
       'http://159.223.62.28:1337'
   ]

   CSRF_TRUSTED_ORIGINS = [
       'http://127.0.0.1:8000',
       'http://127.0.0.1:3000',
       'http://159.223.62.28',
       'http://159.223.62.28:1337'
   ]

   CORS_ORIGINS_WHITELIST = [
       'http://127.0.0.1:8000',
       'http://127.0.0.1:3000',
       'http://159.223.62.28',
       'http://159.223.62.28:1337'
   ]

   CORS_ALLOW_ALL_ORIGINS = True
   ```

   **Explanation:**
   - **DEBUG:** Determines if the application is in debug (development) mode. Set to `0` for production.
   - **ALLOWED_HOSTS:** Specifies which hosts/domains can access the Django application. Restrict this in production for security.
   - **WEBSITE_URL:** Dynamically sets the website URL based on the environment.
   - **CORS Settings:** Configures Cross-Origin Resource Sharing to allow your frontend to communicate with the backend. Adjust these settings to include your production and development URLs.

### iv. Push Changes to GitHub

Ensure all your configuration changes are version-controlled and accessible for deployment.

1. **Initialize Git (if not already initialized):**
   ```bash
   git init
   ```

2. **Add and Commit Changes:**
   ```bash
   git add .
   git commit -m "Configure Docker and Nginx for production deployment"
   ```

3. **Push to GitHub:**
   ```bash
   git remote add origin https://github.com/yourusername/Djangobnb.git
   git push -u origin main
   ```

   **Note:** Replace `yourusername` with your actual GitHub username.

---

## 2. Configure Virtual Machine (VM)

Setting up a VM provides a dedicated environment to host your application. DigitalOcean offers reliable and scalable Droplets (VPS) suitable for this purpose.

### i. Create a Droplet on DigitalOcean

1. **Sign Up / Log In:**
   - Visit [DigitalOcean](https://www.digitalocean.com/) and create an account or log in.

2. **Create a New Droplet:**
   - Click on "Create Droplet."

3. **Select Configuration:**
   - **Image:** Choose **Ubuntu** (latest LTS version recommended).
   - **Plan:** Start with the **Basic** plan; scale as needed.
   - **Datacenter Region:** Select **Singapore** for optimal performance based on your target audience.
   - **Authentication:**
     - **Password:** Choose password authentication and set a strong password.
     - **SSH Keys (Optional):** For enhanced security, consider adding SSH keys.
   - **Finalize and Create:**
     - Optionally, assign the Droplet to a project for organization.
     - Click "Create Droplet."

4. **Obtain Droplet IP:**
   - Once created, note the Droplet's public IP address (e.g., `159.223.62.28`).

### ii. Connect to the Droplet via SSH

Securely access your Droplet to install and configure necessary software.

1. **Connect Using SSH:**
   ```bash
   ssh root@159.223.62.28
   ```
   **Replace `YOUR_PASSWORD` with the password you set during Droplet creation.**

   **Security Tip:** For enhanced security, set up SSH key authentication and disable password-based logins.

### iii. Configure the VM

Once connected to your Droplet, set up the environment to run your Django application.

1. **Update and Upgrade Packages:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install Docker and Docker Compose:**
   Docker ensures your application runs consistently across different environments.

   ```bash
   sudo apt install -y docker.io docker-compose
   sudo systemctl start docker
   sudo systemctl enable docker
   ```

3. **Install Nginx:**
   Nginx will handle incoming HTTP requests, serve static files, and proxy requests to your application.

   ```bash
   sudo apt install -y nginx
   sudo systemctl start nginx
   sudo systemctl enable nginx
   ```

4. **Clone Your Project Repository:**
   Organize your projects within a designated directory.

   ```bash
   mkdir ~/webapps
   cd ~/webapps
   git clone https://github.com/lowjungxuan98/Djangobnb.git
   ```

5. **Set Up Production Environment Variables:**
   Ensure sensitive settings are correctly configured for production.

   ```bash
   cd Djangobnb/backend
   cp .env.dev djangobnb_backend/.env
   vi djangobnb_backend/.env
   ```
   
   - **Edit `.env`:**
     - Change `DEBUG=1` to `DEBUG=0` to disable debug mode in production.
     - Update other environment variables as necessary (e.g., secret keys, database credentials).

6. **Build and Run Docker Containers:**
   Launch your application using the production Docker Compose configuration.

   ```bash
   docker-compose -f docker-compose.prod.yml up --build -d
   ```

   - **Flags:**
     - `-f docker-compose.prod.yml`: Specifies the production Docker Compose file.
     - `--build`: Builds images before starting containers.
     - `-d`: Runs containers in detached mode.

### iv. Configure Nginx

Set up Nginx to serve your frontend and proxy backend requests appropriately.

1. **Navigate to Nginx Configuration Directory:**
   ```bash
   cd ~
   sudo service nginx start
   cd /etc/nginx/sites-enabled/
   ```

2. **Create and Edit `frontend.conf`:**
   ```bash
   sudo touch frontend.conf
   sudo vi frontend.conf
   ```

   **Example `frontend.conf`:**

   ```nginx
   server {
       listen 80;
       server_name 159.223.62.28;

       location / {
           proxy_pass http://localhost:3000; # Adjust if your frontend runs on a different port
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   **Explanation:**
   - **server_name:** Replace with your Droplet's IP or domain name.
   - **proxy_pass:** Directs traffic to your frontend application (e.g., React running on port 3000).

3. **Test Nginx Configuration:**
   ```bash
   sudo nginx -t
   ```

   - **Success Message:** `syntax is ok` and `test is successful`.

4. **Restart Nginx to Apply Changes:**
   ```bash
   sudo service nginx restart
   ```

### v. Set Up a Process Manager

Using a process manager like PM2 ensures your frontend application remains running and can recover from crashes.

1. **Navigate to Your Frontend Directory:**
   ```bash
   cd ~/webapps/Djangobnb/djangobnb
   ```

2. **Install PM2 Globally via npm:**
   ```bash
   sudo npm install -g pm2
   ```

3. **Start the Frontend Application with PM2:**
   ```bash
   pm2 start npm --name "djangobnb" -- start
   ```

   **Flags:**
   - `--name "djangobnb"`: Assigns a name to the process for easier management.
   - `-- start`: Runs the `start` script defined in your `package.json`.

4. **Set PM2 to Start on System Boot:**
   ```bash
   pm2 startup systemd
   pm2 save
   ```

   **Explanation:**
   - **pm2 startup systemd:** Generates and configures a startup script for PM2.
   - **pm2 save:** Saves the current process list to be resurrected on reboot.