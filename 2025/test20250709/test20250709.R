# ステップ1: 必要なパッケージのインストールと読み込み
# ---------------------------------------------------
# もしまだインストールしていなければ、以下のコメントを外して実行してください
# install.packages("xml2")
# install.packages("tidyverse")

library(xml2)
library(tidyverse)
library(openxlsx)

# ステップ2: XMLファイルの読み込みと名前空間の設定
# ---------------------------------------------------
# ファイル名を指定してください
downloads_dir <- file.path(Sys.getenv("USERPROFILE"), "Downloads\\Define XML\\Define XML")
cat("ダウンロードフォルダのパス:", downloads_dir, "\n")
file_path <- "define-2-0-0-Bev-FOLFOX-SBC-20250708130419.xml" %>%
    file.path(downloads_dir, .)

# XMLファイルを読み込み
define_xml <- read_xml(file_path)

# XMLの名前空間を取得します。これらはXPathで要素を指定する際に必要です。
ns <- c(
    odm = "http://www.cdisc.org/ns/odm/v1.3",
    def = "http://www.cdisc.org/ns/def/v2.0"
)


# ステップ3: データセット（表）の一覧を取得する
# ---------------------------------------------------
# ItemGroupDef要素が各データセットの定義に相当します
item_group_nodes <- xml_find_all(define_xml, ".//odm:ItemGroupDef", ns)

# 各ItemGroupDefから情報を抽出し、データフレームに変換
datasets_list_df <- item_group_nodes %>%
    map_dfr(~ {
        tibble(
            OID = xml_attr(.x, "OID"),
            Name = xml_attr(.x, "Name"),
            SASDatasetName = xml_attr(.x, "SASDatasetName"),
            Class = xml_attr(.x, "Class", ns = ns["def"]),
            Description = xml_text(xml_find_first(.x, "./odm:Description/odm:TranslatedText", ns), trim = TRUE)
        )
    })

cat("### 検出されたデータセット一覧\n")
print(datasets_list_df)

# 修正版の関数: Derivation/Comment取得機能を追加
# ---------------------------------------------------
extract_variable_spec <- function(xml_doc, dataset_name, namespaces) {
    # 効率化のため、すべての定義を一度に取得し、マップ（辞書）を作成
    all_item_defs <- xml_find_all(xml_doc, ".//odm:ItemDef", namespaces)
    item_def_map <- all_item_defs %>% set_names(xml_attr(., "OID"))

    # ★★★ 変更点: MethodとCommentの定義を事前にマップ化 ★★★
    method_map <- xml_find_all(xml_doc, ".//odm:MethodDef", namespaces) %>%
        set_names(xml_attr(., "OID"))
    comment_map <- xml_find_all(xml_doc, ".//def:CommentDef", namespaces) %>%
        set_names(xml_attr(., "OID"))

    # 指定されたデータセット名のItemGroupDef要素を検索
    xpath_query <- sprintf(".//odm:ItemGroupDef[@Name='%s']", dataset_name)
    item_group_node <- xml_find_first(xml_doc, xpath_query, namespaces)

    if (is.na(item_group_node)) {
        stop(paste("指定されたデータセット '", dataset_name, "' は見つかりませんでした。"))
    }

    item_refs <- xml_find_all(item_group_node, "./odm:ItemRef", namespaces)

    variable_spec_df <- item_refs %>%
        map_dfr(~ {
            item_oid <- xml_attr(.x, "ItemOID")
            item_def_node <- item_def_map[[item_oid]]

            if (!is.null(item_def_node)) {
                # --- 既存のノード取得 ---
                label_node <- xml_find_first(item_def_node, "./odm:Description/odm:TranslatedText", namespaces)
                codelist_node <- xml_find_first(item_def_node, "./odm:CodeListRef", namespaces)
                origin_node <- xml_find_first(item_def_node, "./def:Origin", namespaces)

                # ★★★ 変更点: Derivation/Comment の取得ロジック ★★★
                # 1. MethodOIDとCommentOIDを変数定義から取得
                method_oid <- xml_attr(.x, "MethodOID") # ItemRefから
                if (is.na(method_oid)) {
                    method_oid <- xml_attr(item_def_node, "MethodOID") # ItemDefから
                }
                comment_oid <- xml_attr(item_def_node, "CommentOID", ns = namespaces["def"])

                # 2. OIDを元にマップから説明テキストを取得
                method_text <- NA_character_
                if (!is.na(method_oid) && method_oid %in% names(method_map)) {
                    method_text <- xml_text(xml_find_first(method_map[[method_oid]], "./odm:Description/odm:TranslatedText", namespaces), trim = TRUE)
                }

                comment_text <- NA_character_
                if (!is.na(comment_oid) && comment_oid %in% names(comment_map)) {
                    comment_text <- xml_text(xml_find_first(comment_map[[comment_oid]], "./odm:Description/odm:TranslatedText", namespaces), trim = TRUE)
                }

                # 3. 取得したテキストを結合（両方存在する場合は" | "で区切る）
                derivation_texts <- c(method_text, comment_text)
                derivation_texts <- derivation_texts[!is.na(derivation_texts)] # NAを削除
                derivation_comment <- if (length(derivation_texts) > 0) paste(derivation_texts, collapse = " | ") else NA_character_


                # ★★★ 変更点: `Derivation/Comment` 列を追加 ★★★
                tibble(
                    Order = xml_attr(.x, "OrderNumber"),
                    Variable = xml_attr(item_def_node, "Name"),
                    Label = xml_text(label_node, trim = TRUE),
                    Origin = xml_attr(origin_node, "Type"),
                    # Rでは列名に "/" を使う場合バッククォート(`)で囲みます
                    `Derivation/Comment` = derivation_comment,
                    DataType = xml_attr(item_def_node, "DataType"),
                    Length = xml_attr(item_def_node, "Length"),
                    CodeList = xml_attr(codelist_node, "CodeListOID"),
                    Mandatory = xml_attr(.x, "Mandatory"),
                    KeySequence = xml_attr(.x, "KeySequence"),
                    ItemOID = item_oid
                )
            }
            # `else`節は省略（ItemDefが見つからないケースは通常ないと想定）
        })

    return(variable_spec_df)
}
# ステップ4: 特定のデータセットの変数定義を抽出する関数
# ---------------------------------------------------
# 指定したデータセット名の変数仕様を抽出する関数を定義
# extract_variable_spec <- function(xml_doc, dataset_name, namespaces) {
#     # 効率化のため、すべてのItemDef（変数定義）を一度に取得し、マップ（辞書）を作成
#     all_item_defs <- xml_find_all(xml_doc, ".//odm:ItemDef", namespaces)
#     item_def_map <- all_item_defs %>% set_names(xml_attr(., "OID"))
#
#     # 指定されたデータセット名のItemGroupDef要素を検索
#     xpath_query <- sprintf(".//odm:ItemGroupDef[@Name='%s']", dataset_name)
#     item_group_node <- xml_find_first(xml_doc, xpath_query, namespaces)
#
#     # データセットが見つからない場合はエラーメッセージを表示
#     if (is.na(item_group_node)) {
#         stop(paste("指定されたデータセット '", dataset_name, "' は見つかりませんでした。"))
#     }
#
#     # ItemGroupDef内のすべてのItemRef（変数への参照）を取得
#     item_refs <- xml_find_all(item_group_node, "./odm:ItemRef", namespaces)
#
#     # 各ItemRefの情報を抽出し、対応するItemDefの詳細情報と結合してデータフレームを作成
#     variable_spec_df <- item_refs %>%
#         map_dfr(~ {
#             item_oid <- xml_attr(.x, "ItemOID")
#             item_def_node <- item_def_map[[item_oid]]
#
#             # ItemDefが見つかった場合のみ詳細情報を取得
#             if (!is.null(item_def_node)) {
#                 label_node <- xml_find_first(item_def_node, "./odm:Description/odm:TranslatedText", namespaces)
#                 codelist_node <- xml_find_first(item_def_node, "./odm:CodeListRef", namespaces)
#
#                 origin_node <- xml_find_first(item_def_node, "./def:Origin", namespaces)
#                 tibble(
#                     Order = xml_attr(.x, "OrderNumber"),
#                     Variable = xml_attr(item_def_node, "Name"),
#                     Label = xml_text(label_node, trim = TRUE),
#                     Origin = xml_attr(origin_node, "Type"),
#                     DataType = xml_attr(item_def_node, "DataType"),
#                     Length = xml_attr(item_def_node, "Length"),
#                     CodeList = xml_attr(codelist_node, "CodeListOID"),
#                     Mandatory = xml_attr(.x, "Mandatory"),
#                     KeySequence = xml_attr(.x, "KeySequence"),
#                     ItemOID = item_oid
#                 )
#             } else {
#                 # ItemDefが見つからない場合（通常は発生しないが念のため）
#                 tibble(
#                     Order = xml_attr(.x, "OrderNumber"),
#                     Variable = NA_character_,
#                     Label = NA_character_,
#                     Origin = NA_character_, # Origin列を追加
#                     DataType = NA_character_,
#                     Length = NA_character_,
#                     CodeList = NA_character_,
#                     Mandatory = xml_attr(.x, "Mandatory"),
#                     KeySequence = xml_attr(.x, "KeySequence"),
#                     ItemOID = item_oid
#                 )
#             }
#         })
#
#     return(variable_spec_df)
# }


# --- 関数の使用例 ---
domain_names <- c(
    "DM",
    "CM",
    "EC",
    "PR",
    "AE",
    "CE",
    "DS",
    "MH",
    "EG",
    "IE",
    "LB",
    "MI",
    "RS",
    "TU",
    "TR",
    "VS"
)
xml_tables <- domain_names %>% map(~ {
    domain <- .x
    res <- extract_variable_spec(define_xml, domain, ns)
    return(res)
})
names(xml_tables) <- domain_names

# Excelファイルの読み込み
excel_path <- "C:/Users/MarikoOhtsuka/Downloads/NHO-Bev-FOLFOX-SBC_SDTMIG_v3.3_PostMappingSpec_Ver1.0.xlsx"
excel_variables_df <- read.xlsx(excel_path, sheet = "Variables")
excel_variables_df <- excel_variables_df %>% filter(is.na(Not.Submmited) | Not.Submmited == "")
excel_variables_df <- excel_variables_df %>%
    mutate(Type = case_when(
        Type == "Char" ~ "text",
        Type == "Num" ~ "integer",
        TRUE ~ Type
    ))
# Dataset.Nameごとにexcel_variables_dfをリスト化
excel_tables <- split(excel_variables_df, excel_variables_df$Dataset.Name)
xml_tables_dm <- xml_tables$DM
excel_tables_dm <- excel_tables$DM %>%
    select(c(
        "Dataset.Name", "Variable.Name", "Variable.Label", "Type",
        "EDC", "Derived", "Spec"
    ))
# 行数が同じか確認
if (nrow(xml_tables_dm) != nrow(excel_tables_dm)) {
    stop("XMLとExcelのDMデータセットの行数が一致しません。")
}
for (row in 1:nrow(xml_tables_dm)) {
    if (xml_tables_dm[row, "Variable"] != excel_tables_dm[row, "Variable.Name"]) {
        stop(paste("XMLとExcelのDMデータセットの変数名が一致しません: 行", row))
    }
    if (xml_tables_dm[row, "Label"] != excel_tables_dm[row, "Variable.Label"]) {
        stop(paste("XMLとExcelのDMデータセットの変数ラベルが一致しません: 行", row))
    }
    if (is.na(excel_tables_dm[row, "EDC"])) {
        if (xml_tables_dm[row, "DataType"] != excel_tables_dm[row, "Type"]) {
            stop(paste("XMLとExcelのDMデータセットのデータ型が一致しません: 行", row))
        }
    }

    if (!is.na(excel_tables_dm[row, "Derived"])) {
        xml_derivation <- xml_tables_dm[row, "Derivation/Comment"] %>%
            str_squish() %>%
            replace_na("")

        excel_spec <- excel_tables_dm[row, "Spec"] %>%
            str_squish() %>%
            replace_na("")

        # 2. 変換後の値を比較
        if (xml_derivation != excel_spec) {
            message("エラー行: ", row)
            message("XML  : '", xml_derivation, "'")
            message("Excel: '", excel_spec, "'")
            stop("XMLとExcelのDMデータセットの派生変数のコメントが一致しません。")
        }
    }
}
View(xml_tables_dm[16, ])
View(excel_tables_dm[16, ])
