# Tauri 更新服务器搭建指南

本教程针对 **GitHub 私有仓库** 的场景：Tauri updater 需要从公开 URL 获取 `latest.json`，但私有仓库的 Release 资源需要认证才能访问。通过搭建一个轻量代理服务器来解决这个问题。

## 整体架构

```
Tauri App  ──→  更新服务器（公开）  ──→  GitHub API（带 PAT 认证）
                 ├─ /update/latest.json     └─ 获取最新 Release 信息
                 └─ /update/download/<file> └─ 代理安装包下载
```

## 1. 准备工作

### 1.1 构建并获取更新产物

首先执行 Tauri 构建，生成签名后的安装包和 `latest.json`：

```bash
TAURI_SIGNING_PRIVATE_KEY=... bun tauri build
```

构建完成后，`src-tauri/target/release/bundle/` 下会生成：
- 安装包（`.msi` / `.exe` / `.dmg` 等）
- 对应的 `.sig` 签名文件
- `latest.json`（更新元信息）

### 1.2 创建 GitHub Personal Access Token

1. 访问 [GitHub Settings → Tokens](https://github.com/settings/tokens)
2. 点击 **Generate new token (classic)**
3. 勾选 `repo` 权限
4. 生成后保存 token（格式：`ghp_xxxxxxxxxxxx`）

### 1.3 上传到 GitHub Release

将构建产物上传到 GitHub Release，确保 `latest.json` 也在其中。

## 2. 更新服务器代码

创建 `update-server.ts`：

```ts
const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const REPO = "avonyu/cadence-desktop";

const server = Bun.serve({
  async fetch(req) {
    const url = new URL(req.url);

    // ── 返回 latest.json ──
    if (url.pathname === "/update/latest.json") {
      const release = await fetch(
        `https://api.github.com/repos/${REPO}/releases/latest`,
        { headers: { Authorization: `Bearer ${GITHUB_TOKEN}` } }
      ).then(r => r.json());

      const asset = release.assets.find(
        (a: any) => a.name === "latest.json"
      );
      if (!asset) return new Response("Not Found", { status: 404 });

      const json = await fetch(asset.url, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/octet-stream",
        },
      }).then(r => r.text());

      return new Response(json, {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── 代理安装包下载 ──
    if (url.pathname.startsWith("/update/download/")) {
      const assetName = url.pathname.replace("/update/download/", "");

      const release = await fetch(
        `https://api.github.com/repos/${REPO}/releases/latest`,
        { headers: { Authorization: `Bearer ${GITHUB_TOKEN}` } }
      ).then(r => r.json());

      const asset = release.assets.find(
        (a: any) => a.name === assetName
      );
      if (!asset) return new Response("Not Found", { status: 404 });

      const response = await fetch(asset.url, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/octet-stream",
        },
      });

      return new Response(response.body, {
        headers: { "Content-Type": "application/octet-stream" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
  port: 3000,
});

console.log(`Update server running on ${server.url}`);
```

## 3. 修改 `tauri.conf.json`

将 updater 端点指向你的服务器：

```json
{
  "plugins": {
    "updater": {
      "pubkey": "你的公钥",
      "endpoints": [
        "https://your-server.com/update/latest.json"
      ],
      "windows": {
        "installMode": "passive"
      }
    }
  }
}
```

## 4. 修改 `latest.json` 中的下载 URL

`tauri build` 生成的 `latest.json` 中，各平台的下载 URL 默认指向 GitHub 直链。需要替换为代理地址后再上传到 Release。

**修改前：**
```json
{
  "version": "0.4.3",
  "notes": "Bug fixes",
  "pub_date": "2026-06-13T00:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "...",
      "url": "https://github.com/avonyu/cadence-desktop/releases/download/v0.4.3/Cadence_Desktop_0.4.3_x64-setup.exe"
    }
  }
}
```

**修改后：**
```json
{
  "version": "0.4.3",
  "notes": "Bug fixes",
  "pub_date": "2026-06-13T00:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "...",
      "url": "https://your-server.com/update/download/Cadence_Desktop_0.4.3_x64-setup.exe"
    }
  }
}
```

> **注意：** URL 中的文件名必须与 GitHub Release 中的 asset 名称一致。

## 5. 部署运行

### 本地测试

```bash
GITHUB_TOKEN=ghp_xxx bun run update-server.ts
```

访问 `http://localhost:3000/update/latest.json` 验证是否返回正确的 JSON。

### 生产部署

将服务部署到有公网 IP 的服务器（VPS / 云服务器），推荐配合：

- **HTTPS**：Tauri updater 要求生产环境使用 HTTPS，可用 Caddy / Nginx 反代并自动申请证书
- **进程守护**：使用 PM2 或 systemd 保持服务运行
- **环境变量**：通过 `.env` 文件或系统环境变量注入 `GITHUB_TOKEN`

### PM2 部署示例

```bash
npm install -g pm2
GITHUB_TOKEN=ghp_xxx pm2 start update-server.ts --name cadence-updater
pm2 save
pm2 startup
```

### Systemd 部署示例

```
[Unit]
Description=Cadence Desktop Update Server
After=network.target

[Service]
Type=simple
User=www
Environment=GITHUB_TOKEN=ghp_xxx
ExecStart=/usr/bin/bun run /path/to/update-server.ts
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

## 6. 可选：静态托管方案（不依赖实时 API）

如果不想运行服务器，也可以手动管理更新文件：

1. 将 `latest.json` 和各平台安装包上传到 CDN / OSS / 公开存储桶
2. 手动修改 `latest.json` 中的 `url` 指向 CDN 地址
3. 将 `tauri.conf.json` 的 `endpoints` 指向 CDN 上的 `latest.json`

这种方式不需要 GitHub Token，但每次发版都需要手动更新文件。
