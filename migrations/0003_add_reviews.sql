DROP TABLE IF EXISTS Reviews;

CREATE TABLE Reviews (
    id TEXT PRIMARY KEY,
    businessId TEXT NOT NULL,
    score INTEGER,
    addedOn INTEGER
);

ALTER TABLE Businesses ADD COLUMN reviewsScore INTEGER;
ALTER TABLE Businesses ADD COLUMN updatedOn INTEGER;