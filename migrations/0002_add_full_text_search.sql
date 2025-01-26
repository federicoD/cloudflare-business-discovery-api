DROP TABLE IF EXISTS BusinessesFTS;
DROP TRIGGER IF EXISTS businesses_ai;
DROP TRIGGER IF EXISTS businesses_au;
DROP TRIGGER IF EXISTS businesses_ad;

CREATE VIRTUAL TABLE BusinessesFTS USING fts5(
  id UNINDEXED,
  name,
  description,
  type
);

INSERT INTO BusinessesFTS (id, name, description, type)
SELECT id, name, description, type FROM Businesses;

CREATE TRIGGER businesses_ai AFTER INSERT ON Businesses
BEGIN
  INSERT INTO BusinessesFTS (id, name, description, type)
  VALUES (new.id, new.name, new.description, new.type);
END;

CREATE TRIGGER businesses_au AFTER UPDATE ON Businesses
BEGIN
  UPDATE BusinessesFTS
  SET name = new.name, description = new.description, type = new.type
  WHERE id = old.id;
END;

CREATE TRIGGER businesses_ad AFTER DELETE ON Businesses
BEGIN
  DELETE FROM BusinessesFTS WHERE id = old.id;
END;