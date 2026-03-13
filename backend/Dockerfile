FROM python:3.11-slim


RUN rm -f /etc/apt/sources.list && \
    rm -rf /etc/apt/sources.list.d/* && \
    echo "deb https://mirrors.tuna.tsinghua.edu.cn/debian bookworm main contrib non-free non-free-firmware" > /etc/apt/sources.list && \
    echo "deb https://mirrors.tuna.tsinghua.edu.cn/debian bookworm-updates main contrib non-free non-free-firmware" >> /etc/apt/sources.list && \
    echo "deb https://mirrors.tuna.tsinghua.edu.cn/debian-security bookworm-security main contrib non-free non-free-firmware" >> /etc/apt/sources.list && \
    apt-get update && \
    apt-get install -y ffmpeg curl unzip && \
    rm -rf /var/lib/apt/lists/*

# 安裝 Deno runtime（yt-dlp 需要用來解決 YouTube JS 驗證）
RUN curl -fsSL https://deno.land/install.sh | sh && \
    ln -sf /root/.deno/bin/deno /usr/local/bin/deno

# 確保 PATH 中包含 ffmpeg 和 deno 路徑
ENV PATH="/root/.deno/bin:/usr/bin:${PATH}"

# 設定 Hugging Face 鏡像源環境變數
ENV HF_ENDPOINT=https://hf-mirror.com

WORKDIR /app
COPY ./backend /app
RUN pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt

# 預下載 yt-dlp YouTube challenge solver script
RUN yt-dlp --remote-components ejs:github --skip-download "https://www.youtube.com/watch?v=dQw4w9WgXcQ" || true

CMD ["python", "main.py"]
