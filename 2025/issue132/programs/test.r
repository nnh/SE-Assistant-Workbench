library(tidyverse)
library(googlesheets4)

library(jsonlite)
config <- fromJSON("config.json")
sheet_id <- config$qa_sheet_id
faq_sheet_id <- config$faq_sheet_id
raw_qa <- read.csv("C:\\Users\\c0002691\\Downloads\\問合せ.csv")
raw_faq <- read.csv("C:\\Users\\c0002691\\Downloads\\FAQ.csv")
# FAQの関連キーワード列からキーワードを取得
faq_keywords <- raw_faq %>%
  select("関連キーワード") %>%
  mutate(関連キーワード = str_split(関連キーワード, "、|，|,")) %>%
  unnest(関連キーワード) %>%
  mutate(関連キーワード = str_trim(関連キーワード)) %>%
  distinct(関連キーワード) %>% arrange(関連キーワード)
# キーワード毎にFAQを抽出してシートに書き込み
all_faq <- tibble()
for (keyword in faq_keywords$関連キーワード) {
  faq_subset <- raw_faq %>%
    filter(str_detect(`関連キーワード`, fixed(keyword))) %>% arrange(desc(`項番`))
  faq_subset$キーワード <- keyword
  all_faq <- bind_rows(all_faq, faq_subset)
}
sheet_write(all_faq, ss = faq_sheet_id, sheet = "FAQ")
qa <- raw_qa %>%
  select("受付番号", "受付日時", "システム区分", "サブシステム名", "問合せ分類", "問合せ内容", "問合せ対応状況","一次回答日時", "一次回答内容", "本回答日時", "本回答内容") %>%
  filter(`問合せ分類` != "移行") %>%
  arrange(desc(`受付日時`))
# 対象外QA
excluded_qa <- qa %>% 
  filter(str_detect(`問合せ内容`, "24H2") | str_detect(`問合せ内容`, "財務会計") | str_detect(`問合せ内容`, "医療安全情報システム"))
inplace_archive <- qa %>% 
  filter(str_detect(`問合せ内容`, "インプレースアーカイブ") | str_detect(`本回答内容`, "インプレースアーカイブ") | str_detect(`問合せ内容`, "オンラインアーカイブ") | str_detect(`本回答内容`, "オンラインアーカイブ")) 
archive <- qa %>%
  filter(str_detect(`問合せ内容`, "アーカイブ") | str_detect(`本回答内容`, "アーカイブ")) %>%
  anti_join(inplace_archive, by = "受付番号")
contact_list <- qa %>% 
  filter(str_detect(`問合せ内容`, "連絡先")| str_detect(`本回答内容`, "連絡先"))
schedule <- qa %>% 
  filter(str_detect(`問合せ内容`, "予定表") | str_detect(`本回答内容`, "予定表"))
teams <- qa %>% 
  filter(str_detect(`問合せ内容`, "Teams") | str_detect(`本回答内容`, "Teams")) %>% anti_join(excluded_qa, by = "受付番号")
shared_mailbox <- qa %>% 
  filter(str_detect(`問合せ内容`, "共有メールボックス")| str_detect(`本回答内容`, "共有メールボックス"))
acrobat <- qa %>% 
  filter(str_detect(`問合せ内容`, "Acrobat"))  
policy <- qa %>% 
  filter(str_detect(`問合せ内容`, "ポリシー"))  
quarantine <- qa %>% 
  filter(str_detect(`問合せ内容`, "検疫") | str_detect(`本回答内容`, "検疫"))  
mailing_list <- qa %>%
  filter(str_detect(`問合せ内容`, "メーリングリスト")| str_detect(`本回答内容`, "メーリングリスト") |
         str_detect(`問合せ内容`, "配布リスト")| str_detect(`本回答内容`, "配布リスト") |
         str_detect(`問合せ内容`, "配布グループ")| str_detect(`本回答内容`, "配布グループ"))
localbrakeout <- qa %>%
  filter(str_detect(`問合せ内容`, "ローカルブレイクアウト") | str_detect(`本回答内容`, "ローカルブレイクアウト"))
channels <- qa %>%
  filter(str_detect(`問合せ内容`, "チャネル") | str_detect(`本回答内容`, "チャネル"))
chat <- qa %>%
  filter(str_detect(`問合せ内容`, "チャット") | str_detect(`本回答内容`, "チャット"))
umbrella <- qa %>%
  filter(str_detect(`問合せ内容`, "Umbrella") | str_detect(`本回答内容`, "Umbrella")) %>% anti_join(excluded_qa, by = "受付番号")
urlblock <- qa %>%
  filter(str_detect(`問合せ内容`, "URLブロック") | str_detect(`本回答内容`, "URLブロック")) %>% anti_join(excluded_qa, by = "受付番号") %>% anti_join(umbrella, by = "受付番号") %>% anti_join(localbrakeout, by = "受付番号")
security <- qa %>%
  filter((str_detect(`問合せ内容`, "セキュリティ") &str_detect(`問合せ内容`, "グループ")) |str_detect(`本回答内容`, "セキュリティ") & str_detect(`本回答内容`, "グループ"))
terminal_type <- qa %>%
  filter(str_detect(`問合せ内容`, "端末種別") | str_detect(`本回答内容`, "端末種別")) %>% anti_join(excluded_qa, by = "受付番号")
facility_outside <- qa %>%
  filter(str_detect(`問合せ内容`, "施設外") | str_detect(`本回答内容`, "施設外"))
mailing_list_group_only <- qa %>%
  filter((str_detect(`本回答内容`, "配布") | str_detect(`本回答内容`, "リスト")) & str_detect(`本回答内容`, "セキュリティ"))
meeting_room <- qa %>%
  filter(str_detect(`問合せ内容`, regex("会議室", ignore_case = TRUE)) | str_detect(`本回答内容`, regex("会議室", ignore_case = TRUE)))
sharepoint <- qa %>%
  filter(str_detect(`問合せ内容`, regex("share", ignore_case = TRUE)) & str_detect(`問合せ内容`, regex("point", ignore_case = TRUE)))
sheet_write(archive, ss = sheet_id, sheet = "archive")
sheet_write(inplace_archive, ss = sheet_id, sheet = "inplace_archive")
sheet_write(contact_list, ss = sheet_id, sheet = "contact_list")
sheet_write(schedule, ss = sheet_id, sheet = "schedule")
sheet_write(teams, ss = sheet_id, sheet = "teams")  
sheet_write(shared_mailbox, ss = sheet_id, sheet = "shared_mailbox")
sheet_write(acrobat, ss = sheet_id, sheet = "acrobat")
sheet_write(policy, ss = sheet_id, sheet = "policy")
sheet_write(quarantine, ss = sheet_id, sheet = "quarantine")
sheet_write(mailing_list, ss = sheet_id, sheet = "mailing_list")
sheet_write(localbrakeout, ss = sheet_id, sheet = "localbrakeout")
sheet_write(channels, ss = sheet_id, sheet = "channels")
sheet_write(chat, ss = sheet_id, sheet = "chat")
sheet_write(umbrella, ss = sheet_id, sheet = "umbrella")
sheet_write(urlblock, ss = sheet_id, sheet = "urlblock")
sheet_write(security, ss = sheet_id, sheet = "security")
sheet_write(terminal_type, ss = sheet_id, sheet = "terminal_type")
sheet_write(facility_outside, ss = sheet_id, sheet = "facility_outside")
sheet_write(mailing_list_group_only, ss = sheet_id, sheet = "mailing_list_group_only")
sheet_write(meeting_room, ss = sheet_id, sheet = "meeting_room")
sheet_write(sharepoint, ss = sheet_id, sheet = "sharepoint")
