# 必要なパッケージをインストールと読み込み
if (!require("rvest")) install.packages("rvest")
if (!require("dplyr")) install.packages("dplyr")

library(rvest)
library(dplyr)

# URLの指定
url <- "https://nho.hosp.go.jp/about/cnt1-0_000103.html"

# ウェブページの読み込み
web_page <- read_html(url)

hospital_names_1 <- map_chr(2:141, function(i) {
  web_page %>%
    html_node(xpath = paste0("//table/tbody/tr[", i, "]/td[2]/div[2]/a/font")) %>%
    html_text(trim = TRUE)
})

# tr[4]からtr[142]の範囲のtd[1]内のaタグのfont要素を取得
hospital_names_2 <- map_chr(4:142, function(i) {
  web_page %>%
    html_node(xpath = paste0("//table/tbody/tr[", i, "]/td[1]/a/font")) %>%
    html_text(trim = TRUE)
})

# 取得した結果をリスト化
hospital_names <- c(hospital_names_1, hospital_names_2) %>% na.omit()
