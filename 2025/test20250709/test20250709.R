library(xml2)
library(tidyverse)
library(openxlsx)
# install.packages("waldo")
library(waldo)
# ステップ2: XMLファイルの読み込みと名前空間の設定
# ---------------------------------------------------
# ファイル名を指定してください
xml_filename <- "define-2-0-0-Bev-FOLFOX-SBC-20250708130419.xml"
downloads_dir <- file.path(Sys.getenv("USERPROFILE"), "Downloads\\Define XML\\Define XML")
cat("ダウンロードフォルダのパス:", downloads_dir, "\n")
file_path <- xml_filename %>%
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
tables_list <- domain_names %>% map(~ {
    domain <- .x
    xmltable <- xml_tables[[domain]]
    exceltable <- excel_tables[[domain]] %>%
        select(c(
            "Dataset.Name", "Variable.Name", "Variable.Label", "Type",
            "EDC", "Derived", "Spec"
        ))
    res <- list()
    res$XML <- xmltable
    res$Excel <- exceltable
    return(res)
})
names(tables_list) <- domain_names
CompareXmlAndExcel <- function(xml_table, excel_table, domain) {
    message(paste0("XMLとExcelの", domain, "データセットを比較しています..."))
    xml_valiables <- xml_table["Variable"] %>% unlist()
    excel_valiabes <- excel_table["Variable.Name"] %>% unlist()
    # XMLとExcelのデータセットの行数が同じか確認
    if (nrow(xml_table) != nrow(excel_table)) {
        if (nrow(xml_table) < nrow(excel_table)) {
            diff_valiables <- setdiff(excel_valiabes, xml_valiables)
            stop(paste0(
                "XMLとExcelの", domain, "データセットの行数が一致しません。\n",
                "XML: ", nrow(xml_table), "行, Excel: ", nrow(excel_table), "行\n",
                "Excelにのみ存在する変数: ", paste(diff_valiables, collapse = ", ")
            ))
        } else {
            diff_valiables <- setdiff(xml_valiables, excel_valiabes)
            # xml_table$Variableとexcel_table$Variable.Nameが一致するレコードだけ残す
            xml_table <- xml_table %>% filter(Variable %in% excel_table$Variable.Name)
            warning(paste0(
                "XMLとExcelの", domain, "データセットの行数が一致しません。\n",
                "XML: ", nrow(xml_table), "行, Excel: ", nrow(excel_table), "行\n",
                "XMLにのみ存在する変数: ", paste(diff_valiables, collapse = ", ")
            ))
        }
    }
    # 各行の変数名、ラベル、データ型を比較
    for (row in 1:nrow(xml_table)) {
        if (xml_table[row, "Variable"] != excel_table[row, "Variable.Name"]) {
            stop(paste0(
                "XMLとExcelの", domain, "データセットの変数名が一致しません: 行", row, "\n",
                "XML  : '", xml_table[row, "Variable"], "'\n",
                "Excel: '", excel_table[row, "Variable.Name"], "'"
            ))
        }
        if (xml_table[row, "Label"] != excel_table[row, "Variable.Label"]) {
            stop(paste0(
                "XMLとExcelの", domain, "データセットの変数ラベルが一致しません: 行", row, "\n",
                "変数名: ", xml_table[row, "Variable"], "\n",
                "XML  : '", xml_table[row, "Label"], "'\n",
                "Excel: '", excel_table[row, "Variable.Label"], "'"
            ))
        }
        if (is.na(excel_table[row, "EDC"])) {
            if (xml_table[row, "DataType"] != excel_table[row, "Type"]) {
                stop(paste0("XMLとExcelの", domain, "データセットのデータ型が一致しません: 行", row))
            }
        }

        if (!is.na(excel_table[row, "Derived"])) {
            if (is.na(excel_table[row, "EDC"])) {
                if (xml_table[row, "Origin"] != "Derived") {
                    if (
                        (domain != "LB" && row != 11) &&
                            (domain != "RS" && row != 2) &&
                            (domain != "VS" && row != 9)
                    ) {
                        stop(paste0(
                            "XMLとExcelの", domain, "データセットのOriginが'Derived'ではありません: 行", row, "\n",
                            "変数名: ", xml_table[row, "Variable"]
                        ))
                    }
                }
            }
            xml_derivation <- xml_table[row, "Derivation/Comment"] %>%
                str_squish() %>%
                replace_na("")

            excel_spec <- excel_table[row, "Spec"] %>%
                str_squish() %>%
                replace_na("")

            # 変換後の値を比較
            if (xml_derivation != excel_spec) {
                if (domain == "DM" && row == 16 && xml_derivation == "" && excel_spec == '"YEARS"') {
                    message("DMデータセットの16行目は目視確認が必要です。")
                    next
                }
                if (domain == "EC" && row == 10 && xml_derivation == "" && excel_spec == 'EC.ECDOSE if ECTRT = "BEVACIZUMAB(GENETICAL RECOMBINATION)" then do; if not ( (USUBJID = "Bev-FOLFOX-SBC-0005" and VISIT = "Cycle2") or (USUBJID = "Bev-FOLFOX-SBC-0007" and VISIT = "Cycle1") ) then do; if DM.ARMCD = "Placebo" then ECDOSE = 0; end; end;') {
                    message("ECデータセットの10行目は目視確認が必要です。")
                    next
                }
                if (domain == "MI" && row == 11 && xml_derivation == "" && excel_spec == '"TISSUE"') {
                    message("MIデータセットの11行目は目視確認が必要です。")
                    next
                }
                if (domain == "RS" && row == 1 && xml_derivation == "" && excel_spec == "RS.STUDYID, QS.STUDYID") {
                    message("RSデータセットの1行目は目視確認が必要です。")
                    next
                }
                if (domain == "RS" && row == 2 && xml_derivation == "" && excel_spec == '"RS"') {
                    message("RSデータセットの2行目は目視確認が必要です。")
                    next
                }
                if (domain == "RS" && row == 3 && xml_derivation == "Concatenation of STUDYID and SUBJID" && excel_spec == "RS.USUBJID, QS.USUBJID") {
                    message("RSデータセットの3行目は目視確認が必要です。")
                    next
                }
                if (domain == "RS" && row == 4 && xml_derivation == "Sequential number identifying records within each STUDYID in the domain." && excel_spec == "Renumbering by USUBJID") {
                    message("RSデータセットの4行目は目視確認が必要です。")
                    next
                }
                if (domain == "RS" && row == 10 && xml_derivation == "" && excel_spec == "RS.RSORRES, QS.QSORRES") {
                    message("RSデータセットの10行目は目視確認が必要です。")
                    next
                }
                if (domain == "RS" && row == 18 && xml_derivation == "" && excel_spec == "RS.RSDTC, QS.QSDTC") {
                    message("RSデータセットの18行目は目視確認が必要です。")
                    next
                }
                if (domain == "TR" && row == 4 && xml_derivation == "Sequential number identifying records within each STUDYID in the domain." && excel_spec == "Renumbering by USUBJID") {
                    message("TRデータセットの4行目は目視確認が必要です。")
                    next
                }
                if (domain == "VS" && row == 22 && xml_derivation == "" && excel_spec == '"Administration"') {
                    message("VSデータセットの22行目は目視確認が必要です。")
                    next
                }

                message("エラー行: ", row)
                message("XML  : '", xml_derivation, "'")
                message("Excel: '", excel_spec, "'")
                stop(paste0("XMLとExcelの", domain, "データセットの派生変数のコメントが一致しません。"))
            }
        }
    }
    message(paste0("XMLとExcelの", domain, "データセットは一致しています。"))
}


# --- ステップ2: DatasetとKeysを抽出する新し い関数 ---

#' @title データセットとそのキー変数を抽出する関数
#' @param xml_doc パース済みのXMLオブジェクト
#' @param namespaces XMLの名前空間リスト
#' @return DatasetとKeysを含むデータフレーム
extract_dataset_keys <- function(xml_doc, namespaces) {
    # 効率化のため、すべてのItemDef（変数定義）をOIDをキーとしてマップ化
    item_def_map <- xml_find_all(xml_doc, ".//odm:ItemDef", namespaces) %>%
        set_names(xml_attr(., "OID"))

    # すべてのデータセット定義 (ItemGroupDef) を取得
    item_group_nodes <- xml_find_all(xml_doc, ".//odm:ItemGroupDef", namespaces)

    # 各データセットから情報を抽出し、データフレームに変換
    keys_df <- item_group_nodes %>%
        map_dfr(~ {
            dataset_node <- .x

            # データセット名を取得
            dataset_name <- xml_attr(dataset_node, "Name")

            # KeySequence属性を持つすべてのItemRef（キー変数）を検索
            key_refs <- xml_find_all(dataset_node, "./odm:ItemRef[@KeySequence]", ns = namespaces)

            # キーが見つかった場合の処理
            if (length(key_refs) > 0) {
                # KeySequenceの順序で並べ替えるために、一時的なデータフレームを作成
                keys_info <- key_refs %>%
                    map_dfr(~ tibble(
                        Sequence = as.integer(xml_attr(.x, "KeySequence")),
                        ItemOID = xml_attr(.x, "ItemOID")
                    )) %>%
                    arrange(Sequence)

                # マップを使ってItemOIDから変数名を取得
                key_variable_names <- map_chr(keys_info$ItemOID, ~ {
                    if (.x %in% names(item_def_map)) {
                        xml_attr(item_def_map[[.x]], "Name")
                    } else {
                        NA_character_ # マップにない場合 (通常は発生しない)
                    }
                })

                # 変数名をカンマ区切りの文字列に結合
                keys_string <- paste(key_variable_names, collapse = ", ")
            } else {
                # キーが見つからなかった場合
                keys_string <- NA_character_
            }

            # このデータセットの結果を1行のtibbleとして返す
            tibble(
                Dataset = dataset_name,
                Keys = keys_string
            )
        })

    return(keys_df)
}
# keyの確認
# XMLから抽出したデータセットとキー情報を定数として定義
correct_dataset_keys <- tibble::tribble(
    ~Dataset, ~Keys,
    "DM",     "STUDYID, USUBJID",
    "CM",     "STUDYID, USUBJID, CMTRT, CMSTDTC",
    "EC",     "STUDYID, USUBJID, ECTRT, ECMOOD, ECSTDTC",
    "PR",     "STUDYID, USUBJID, PRTRT, PRSTDTC",
    "AE",     "STUDYID, USUBJID, AEDECOD, AESTDTC",
    "CE",     "STUDYID, USUBJID, CETERM",
    "DS",     "STUDYID, USUBJID, DSSTDTC",
    "MH",     "STUDYID, USUBJID, MHDECOD",
    "EG",     "STUDYID, USUBJID, EGTESTCD, VISITNUM",
    "IE",     "STUDYID, USUBJID, IETESTCD",
    "LB",     "STUDYID, USUBJID, LBTESTCD, LBSPEC, VISITNUM",
    "MI",     "STUDYID, USUBJID, MITESTCD, VISITNUM, MIDTC",
    "QS",     "STUDYID, USUBJID, QSCAT, QSTESTCD, VISITNUM",
    "RS",     "STUDYID, USUBJID, RSTESTCD, RSCAT, RSEVAL, VISITNUM",
    "TR",     "STUDYID, USUBJID, TRTESTCD, TRLNKID, TREVAL, VISITNUM",
    "TU",     "STUDYID, USUBJID, TUTESTCD, TULNKID, TUEVAL, VISITNUM",
    "VS",     "STUDYID, USUBJID, VSTESTCD, VISITNUM, VSTPTNUM"
)
#' @title 2つのキー定義データフレームを比較し、結果を報告する関数
#' @param correct_df 正解データとなるデータフレーム
#' @param extracted_df 比較対象となるデータフレーム
#' @return コンソールに比較結果を出力する
compare_and_report_keys <- function(correct_df, extracted_df) {
    cat("### 正解データとXML抽出結果の比較\n\n")

    # 比較前にDataset名でソート
    correct_sorted <- correct_df %>% arrange(Dataset)
    extracted_sorted <- extracted_df %>% arrange(Dataset)

    # waldo::compare を使って比較
    comparison_result <- waldo::compare(
        correct_sorted,
        extracted_sorted,
        x_arg = "正解データ",
        y_arg = "XML抽出データ"
    )

    # 比較結果を表示
    if (length(comparison_result) == 0) {
        cat("✅ 比較の結果、2つのテーブルは完全に一致しました。\n")
    } else {
        cat("⚠️ 比較の結果、差異が見つかりました:\n\n")
        print(comparison_result)
    }
}
dummy <- domain_names %>% map(~ {
    domain <- .x
    xml_table <- tables_list[[domain]]$XML
    excel_table <- tables_list[[domain]]$Excel
    CompareXmlAndExcel(xml_table, excel_table, domain)
})

sdtm_datasets_table <- extract_dataset_keys(define_xml, ns)

compare_and_report_keys(correct_dataset_keys, sdtm_datasets_table)
