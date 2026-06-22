-- Visitor Management System - Database Schema
-- Run this once to set up the database

CREATE DATABASE IF NOT EXISTS visitor_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE visitor_management;

-- Companies / Offices
CREATE TABLE IF NOT EXISTS companies (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(255) UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  phone         VARCHAR(20),
  address       TEXT,
  logo_url      VARCHAR(500),
  city          VARCHAR(100),
  state         VARCHAR(100),
  country       VARCHAR(100) DEFAULT 'India',
  whatsapp_provider  ENUM('twilio','meta','wati','none') DEFAULT 'none',
  whatsapp_api_key   TEXT,
  whatsapp_from      VARCHAR(50),
  status        ENUM('active','inactive','pending') DEFAULT 'pending',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Users: super admin + company admins + associate logins (company_user role, linked via employee_id)
CREATE TABLE IF NOT EXISTS users (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  company_id  INT NULL,
  employee_id INT NULL,
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  role        ENUM('super_admin','company_admin','company_user') NOT NULL DEFAULT 'company_admin',
  status      ENUM('active','inactive') DEFAULT 'active',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id)  REFERENCES companies(id)  ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id)  ON DELETE SET NULL
);

-- Departments (per company)
CREATE TABLE IF NOT EXISTS departments (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  company_id  INT NOT NULL,
  name        VARCHAR(255) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Employees (per company)
CREATE TABLE IF NOT EXISTS employees (
  id             INT PRIMARY KEY AUTO_INCREMENT,
  company_id     INT NOT NULL,
  department_id  INT NULL,
  name           VARCHAR(255) NOT NULL,
  phone          VARCHAR(20) NOT NULL,
  email          VARCHAR(255),
  designation    VARCHAR(255),
  location       VARCHAR(255),
  status         ENUM('active','inactive') DEFAULT 'active',
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- Associate availability (weekly recurring schedule)
CREATE TABLE IF NOT EXISTS associate_availability (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  company_id    INT NOT NULL,
  employee_id   INT NOT NULL,
  day_of_week   TINYINT NOT NULL,
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  slot_duration INT NOT NULL DEFAULT 30,
  is_active     TINYINT DEFAULT 1,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id)  REFERENCES companies(id)  ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id)  ON DELETE CASCADE
);

-- Scheduled visits (advance bookings)
CREATE TABLE IF NOT EXISTS scheduled_visits (
  id               INT PRIMARY KEY AUTO_INCREMENT,
  company_id       INT NOT NULL,
  employee_id      INT NULL,
  service_id       INT NULL,
  service_name     VARCHAR(255),
  visitor_name     VARCHAR(255) NOT NULL,
  visitor_mobile   VARCHAR(20) NOT NULL,
  visitor_email    VARCHAR(255),
  scheduled_date   DATE NOT NULL,
  scheduled_time   TIME NOT NULL,
  purpose          TEXT,
  status           ENUM('pending','confirmed','cancelled','checked_in','no_show') DEFAULT 'pending',
  booking_ref      VARCHAR(20) UNIQUE NOT NULL,
  admin_notes      TEXT,
  visit_id         INT NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id)  REFERENCES companies(id)  ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id)  ON DELETE SET NULL
);

-- Visitors (unique per company by mobile)
CREATE TABLE IF NOT EXISTS visitors (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  company_id  INT NOT NULL,
  name        VARCHAR(255) NOT NULL,
  mobile      VARCHAR(20) NOT NULL,
  email       VARCHAR(255),
  address     TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_visitor_mobile (company_id, mobile),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Visits (each check-in event)
CREATE TABLE IF NOT EXISTS visits (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  company_id      INT NOT NULL,
  visitor_id      INT NOT NULL,
  employee_id     INT NOT NULL,
  visit_time      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  purpose         TEXT,
  status          ENUM('pending','approved','rejected','completed') DEFAULT 'pending',
  whatsapp_sent   TINYINT(1) DEFAULT 0,
  whatsapp_error  TEXT,
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (visitor_id) REFERENCES visitors(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Employee ↔ Service assignments (many-to-many)
CREATE TABLE IF NOT EXISTS employee_services (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  service_id  INT NOT NULL,
  company_id  INT NOT NULL,
  UNIQUE KEY uq_emp_svc (employee_id, service_id),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id)  REFERENCES services(id)  ON DELETE CASCADE,
  FOREIGN KEY (company_id)  REFERENCES companies(id) ON DELETE CASCADE
);

-- Default super admin (password: Admin@123 - CHANGE IN PRODUCTION)
INSERT IGNORE INTO users (company_id, name, email, password, role, status)
VALUES (
  NULL,
  'Super Admin',
  'admin@visitorapp.com',
  '$2a$10$9DaLbk.0rHNxxLIulxWuSO34Y05nR0W37CxtHHvxYfxpm45u6.u4u',
  'super_admin',
  'active'
);
