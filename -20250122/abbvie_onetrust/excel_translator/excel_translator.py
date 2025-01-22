from deep_translator import GoogleTranslator
import pandas as pd

# 翻訳関数
def translate_dataframe(df, target_language="ja"):
    translated_df = df.copy()
    translator = GoogleTranslator(source='auto', target=target_language)
    for column in df.columns:
        translated_df[column] = df[column].apply(
            lambda x: translator.translate(str(x)) if pd.notnull(x) else x
        )
    return translated_df

# ファイル読み込みと処理
file_path = r"C:\Users\MarikoOhtsuka\Downloads\7721 _ National Hospital Organization Nagoya Medical Center (Japan) - 20247668.xlsx"
excel_data = pd.ExcelFile(file_path)
sheets_data = {sheet: excel_data.parse(sheet) for sheet in excel_data.sheet_names}
translated_sheets = {sheet_name: translate_dataframe(data) for sheet_name, data in sheets_data.items()}

# 翻訳済みデータを保存
translated_file_path = r"C:\Users\MarikoOhtsuka\Downloads\Translated_Nagoya_Medical_Center.xlsx"
with pd.ExcelWriter(translated_file_path, engine='xlsxwriter') as writer:
    for sheet_name, translated_data in translated_sheets.items():
        translated_data.to_excel(writer, sheet_name=sheet_name, index=False)

print(f"Translated file saved to {translated_file_path}")
