<?php
/**
 * MetadataDao.class.php
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */

class Kloudspeaker_MetadataDao {
	private $env;
	private $db;

	public function __construct($env) {
		$this->env = $env;
		$this->db = $env->db();
	}

	public function getItemMetadata($id, $key = NULL) {
		if ($key != NULL) {
			return $this->db->query(sprintf("SELECT md_value FROM " . $this->db->table("metadata") . " WHERE item_id = %s and md_key=%s", $this->db->string($id, TRUE), $this->db->string($key, TRUE)))->firstValue("md_value");
		}

		return $this->db->query(sprintf("SELECT md_key, md_value FROM " . $this->db->table("metadata") . " WHERE item_id = %s", $this->db->string($id, TRUE)))->valueMap('md_key', 'md_value');
	}

	public function setItemMetadata($id, $key, $value) {
		$idStr = $this->db->string($id, TRUE);

		$count = $this->db->query(sprintf("SELECT count(item_id) FROM " . $this->db->table("metadata") . " where item_id=%s and md_key=%s", $idStr, $this->db->string($key, TRUE)))->value();
		if ($count > 0) {
			$this->db->update(sprintf("UPDATE " . $this->db->table("metadata") . " set md_value=%s where item_id=%s and md_key=%s", $this->db->string($value, TRUE), $idStr, $this->db->string($key, TRUE)));
		} else {
			$this->db->update(sprintf("INSERT INTO " . $this->db->table("metadata") . " (item_id, md_key, md_value) VALUES (%s, %s, %s)", $idStr, $this->db->string($key, TRUE), $this->db->string($value, TRUE)));
		}
	}

	public function find($parent, $key, $value = FALSE, $recursive = FALSE) {
		$pathFilter = $this->env->filesystem()->itemIdProvider()->pathQueryFilter($parent, $recursive);

		$query = "SELECT item_id, md_key, md_value from " . $this->db->table("metadata") . " md, " . $this->db->table("item_id") . " i where md.item_id = i.id AND " . $pathFilter;
		if ($value) {
			$query .= " and md_value like '%" . $this->db->string($value) . "%'";
		}

		if ($value) {
			return $this->db->query($query)->valueMap("item_id", "md_value");
		} else {
			return $this->db->query($query)->listMap("item_id");
		}
	}

	public function removeItemMetadata($item, $key = NULL) {
		if ($key == NULL) {
			return $this->deleteMetadata($item);
		}

		return $this->db->update(sprintf("DELETE FROM " . $db->table("metadata") . " WHERE item_id = %s and md_key = %s" . $this->db->string($item->id(), TRUE), $this->db->string($key, TRUE)));
	}

	public function getItemMetadataForChildren($parent) {
		$if = $this->env->filesystem()->itemIdProvider()->pathQueryFilter($parent, FALSE, NULL);

		return $this->groupDataByItem($this->db->query("SELECT item_id, md_key, md_value FROM " . $this->db->table("metadata") . " WHERE item_id in (select id from " . $this->db->table("item_id") . " where ". $if .") order by item_id asc")->rows());
	}

	private function groupDataByItem($data) {
		$result = array();
		foreach ($data as $row) {
			$id = $row["item_id"];
			if (!isset($result[$id])) {
				$result[$id] = array();
			}
			$result[$id][$row["md_key"]] = $row["md_value"];
		}
		return $result;
	}

	public function deleteMetadata($item) {
		if ($item->isFile()) {
			return $this->db->update("DELETE FROM " . $this->db->table("metadata") . " WHERE item_id = " . $this->db->string($item->id(), TRUE));
		} else {
			return $this->db->update(sprintf("DELETE FROM " . $this->db->table("metadata") . " WHERE item_id in (select id from " . $this->db->table("item_id") . " where path like '%s%%')", str_replace("'", "\'", $this->db->string($item->location()))));
		}
	}

	public function cleanupItemIds($ids) {
		$this->db->update(sprintf("DELETE FROM " . $this->db->table("metadata") . " WHERE item_id in (%s)", $this->db->arrayString($ids, TRUE)));
	}
}
?>