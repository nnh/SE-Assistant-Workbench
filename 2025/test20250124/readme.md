# Whisper セットアップ手順

この手順では、Whisperを新しい端末でセットアップし、音声認識を実行する方法を説明します。

---

## 必要条件

- **Python 3.7以上**
- **Rust**
- **ffmpeg**

---

## セットアップ手順

以下の手順に従ってセットアップを行ってください。

### 1. Pythonのインストール
WhisperはPython 3.7以上が必要です。以下のコマンドでPythonをインストールします（`asdf`を使用）。

```bash
asdf plugin add python
asdf install python 3.12.0
asdf global python 3.12.0
```

### 2. Rustのインストール
Whisperの依存パッケージをビルドするためにRustが必要です。以下のコマンドでRustをインストールします。

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### 3. ffmpegのインストール
Whisperは音声処理に`ffmpeg`を使用します。以下のコマンドでインストールしてください。

#### Macの場合（Homebrewを使用）
```bash
brew install ffmpeg
```

#### Linuxの場合（aptを使用）
```bash
sudo apt update
sudo apt install ffmpeg
```

#### Windowsの場合
[公式サイト](https://ffmpeg.org/)からインストールし、環境変数にパスを設定してください。

### 4. Whisperのインストール
以下のコマンドでWhisperをインストールします。

```bash
pip install openai-whisper
```

---

## 動作確認

以下のコードを使って、Whisperが正しく動作するか確認します。

### サンプルコード
次のコードを`test.py`として保存してください。

```python
import whisper

# Whisperモデルのロード
model = whisper.load_model("base")

# 音声ファイルの文字起こし
result = model.transcribe("path/to/your/audio.m4a", language="en")

# 結果を出力
print(result["text"])
```

---

### 実行方法

ターミナルで以下のコマンドを実行します。

```bash
python test.py
```

- `"path/to/your/audio.m4a"`は、実際の音声ファイルのパスに置き換えてください。
- 音声ファイルの文字起こし結果がターミナルに表示されれば成功です！

---

## 注意事項

- WhisperはCPUでも動作しますが、GPUを利用すると処理速度が大幅に向上します。GPUを利用する場合は、CUDA対応のPyTorchをインストールしてください。
- 詳細は[Whisperの公式リポジトリ](https://github.com/openai/whisper)を参照してください。
