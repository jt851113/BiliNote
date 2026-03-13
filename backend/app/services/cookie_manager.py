import json
from pathlib import Path
from typing import Dict, Optional


class CookieConfigManager:
    def __init__(self, filepath: str = "config/downloader.json"):
        self.path = Path(filepath)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self._write({})

    def _read(self) -> Dict[str, Dict[str, str]]:
        try:
            with self.path.open("r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    def _write(self, data: Dict[str, Dict[str, str]]):
        with self.path.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def get(self, platform: str) -> Optional[str]:
        data = self._read()
        return data.get(platform, {}).get("cookie")

    def set(self, platform: str, cookie: str):
        data = self._read()
        current = data.get(platform, {})
        current["cookie"] = cookie
        data[platform] = current
        self._write(data)

    def get_config(self, platform: str) -> Dict[str, str]:
        data = self._read()
        config = data.get(platform, {})
        return {
            "mode": config.get("mode", "auto"),
            "browser": config.get("browser", "chrome"),
            "cookie": config.get("cookie", ""),
        }

    def set_config(self, platform: str, config: Dict[str, str]):
        data = self._read()
        current = data.get(platform, {})
        current.update(config or {})
        data[platform] = current
        self._write(data)

    def delete(self, platform: str):
        data = self._read()
        if platform in data:
            del data[platform]
            self._write(data)

    def list_all(self) -> Dict[str, str]:
        data = self._read()
        return {k: v.get("cookie", "") for k, v in data.items()}

    def exists(self, platform: str) -> bool:
        return self.get(platform) is not None
