CREATE TABLE users (
  id VARCHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role ENUM('superadmin', 'admin', 'professeur') DEFAULT 'professeur',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE trimestres (
  id INT(11) NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active TINYINT(1) DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE classes (
  id INT(11) NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE class_users (
  class_id INT(11) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  is_principal TINYINT(1) DEFAULT 0,
  PRIMARY KEY (class_id, user_id),
  CONSTRAINT fk_cu_class FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE,
  CONSTRAINT fk_cu_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE levels (
  id INT(11) NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  medal_image VARCHAR(255) DEFAULT NULL,
  global_medal_id INT(11) DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_level_medal FOREIGN KEY (global_medal_id) REFERENCES global_medals (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE items (
  id INT(11) NOT NULL AUTO_INCREMENT,
  level_id INT(11) NOT NULL,
  name VARCHAR(255) NOT NULL,
  points_required INT(11) NOT NULL,
  image VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_item_level FOREIGN KEY (level_id) REFERENCES levels (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE global_medals (
  id INT(11) NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  points_required INT(11) NOT NULL,
  image VARCHAR(255) DEFAULT NULL,
  is_level_medal TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE points_log (
  class_id INT(11) NOT NULL,
  item_id INT(11) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  trimestre_id INT(11) NOT NULL,
  points_awarded INT(11) DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pl_class FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE,
  CONSTRAINT fk_pl_item FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE,
  CONSTRAINT fk_pl_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_pl_trimestre FOREIGN KEY (trimestre_id) REFERENCES trimestres (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE class_archives (
  id INT(11) NOT NULL AUTO_INCREMENT,
  class_id INT(11) NOT NULL,
  trimestre_id INT(11) NOT NULL,
  total_points INT(11) DEFAULT 0,
  levels_validated JSON DEFAULT NULL,
  global_medal_id INT(11) DEFAULT NULL,
  archived_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_ca_class FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE,
  CONSTRAINT fk_ca_trimestre FOREIGN KEY (trimestre_id) REFERENCES trimestres (id) ON DELETE CASCADE,
  CONSTRAINT fk_ca_medal FOREIGN KEY (global_medal_id) REFERENCES global_medals (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;