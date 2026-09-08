CREATE TABLE `classes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `global_medals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `points_required` int(11) NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  `is_level_medal` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `trimestres` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `is_active` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `users` (
  `id` varchar(36) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `role` enum('superadmin','admin','professeur') NOT NULL DEFAULT 'professeur',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `class_archives` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `class_id` int(11) NOT NULL,
  `trimestre_id` int(11) NOT NULL,
  `total_points` int(11) DEFAULT 0,
  `levels_validated` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`levels_validated`)),
  `global_medal_id` int(11) DEFAULT NULL,
  `archived_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_ca_class` (`class_id`),
  KEY `fk_ca_trimestre` (`trimestre_id`),
  KEY `fk_ca_medal` (`global_medal_id`),
  CONSTRAINT `fk_ca_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ca_medal` FOREIGN KEY (`global_medal_id`) REFERENCES `global_medals` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ca_trimestre` FOREIGN KEY (`trimestre_id`) REFERENCES `trimestres` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `class_users` (
  `class_id` int(11) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `is_principal` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`class_id`,`user_id`),
  KEY `fk_cu_user` (`user_id`),
  CONSTRAINT `fk_cu_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cu_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `levels` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `medal_image` varchar(255) DEFAULT NULL,
  `global_medal_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_level_medal` (`global_medal_id`),
  CONSTRAINT `fk_level_medal` FOREIGN KEY (`global_medal_id`) REFERENCES `global_medals` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `level_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `points_required` int(11) NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_item_level` (`level_id`),
  CONSTRAINT `fk_item_level` FOREIGN KEY (`level_id`) REFERENCES `levels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `points_log` (
  `class_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `trimestre_id` int(11) NOT NULL,
  `points_awarded` int(11) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  KEY `fk_pl_class` (`class_id`),
  KEY `fk_pl_item` (`item_id`),
  KEY `fk_pl_user` (`user_id`),
  KEY `fk_pl_trimestre` (`trimestre_id`),
  CONSTRAINT `fk_pl_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pl_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pl_trimestre` FOREIGN KEY (`trimestre_id`) REFERENCES `trimestres` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pl_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;