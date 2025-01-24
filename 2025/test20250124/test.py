import whisper

# モデルをロード（baseモデルは比較的速い）
model = whisper.load_model("base")

# 音声ファイルのパス
audio_file = "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/Users/ohtsuka/2025/20250124/gd-slicer.m4a"  # ここをアップロードしたファイルのパスに置き換え

# 音声ファイルを文字起こし
result = model.transcribe(audio_file, language="en")

# 結果を表示
print("文字起こし結果:")
print(result["text"])
