#' title
#' description
#' @file create-issue-functions.R
#' @author Mariko Ohtsuka
#' @date 2025.3.6
# ------ libraries ------
library(httr)
library(jsonlite)
library(aws.s3)
# ------ constants ------
source(here("programs", "functions", "common.R"),  encoding="UTF-8")
kMeddraReleaseTxt <- "meddra_release.asc"
# ------ functions ------
GetLabelId <- function(label_name, api_key) {
  query <- '
  query {
    issueLabels {
      nodes {
        id
        name
      }
    }
  }
  '
  url <- "https://api.linear.app/graphql"
  response <- POST(
    url,
    add_headers(Authorization = api_key), 
    body = list(query = query),
    encode = "json"
  )
  result <- content(response, "parsed")
  if (!is.null(result$errors)) {
    stop("APIエラー: ", result$errors[[1]]$message)
  }
  label_list <- result$data$issueLabels$nodes
  label_id <- NULL
  for (label in label_list) {
    if (label$name == label_name) {
      label_id <- label$id
      break
    }
  }
  if (is.null(label_id)) {
    stop("指定されたラベルが見つかりません: ", label_name)
  }
  return(label_id)
}
CreateIssue <- function(api_key, team_id, title, description, label_id) {
  query <- '
  mutation CreateIssue($teamId: String!, $title: String!, $description: String, $labelIds: [String!]) {
    issueCreate(input: {
      teamId: $teamId, 
      title: $title, 
      description: $description, 
      labelIds: $labelIds
    }) {
      issue {
        id
        title
        labels {
          nodes {
            name
          }
        }
      }
    }
  }
  '
  variables <- list(
    teamId = team_id,
    title = title,
    description = description,
    labelIds = label_id
  )
  url <- "https://api.linear.app/graphql"
  response <- POST(
    url,
    add_headers(Authorization = api_key), 
    body = list(query = query, variables = variables),
    encode = "json"
  )
  result <- content(response, "parsed")
  
  if (!is.null(result$data$issueCreate$issue)) {
    issue_id <- result$data$issueCreate$issue$id
    issue_title <- result$data$issueCreate$issue$title
    issue_labels <- sapply(result$data$issueCreate$issue$labels$nodes, function(label) label$name)
    message("Issueが作成されました: ", issue_title, " (ID: ", issue_id, ")\nラベル: ", paste(issue_labels, collapse = ", "))
  } else {
    message("Issueの作成に失敗しました: ", result$errors[[1]]$message)
  }
}
GetTeamNameAndId <- function(api_key) {
  query <- '
  query {
    teams {
      nodes {
        id
        name
      }
    }
  }
  '
  linear_api_url <- "https://api.linear.app/graphql"
  response <- POST(
    url = linear_api_url,
    add_headers(Authorization = api_key), 
    body = list(query = query),
    encode = "json"
  )
  if (status_code(response) != 200) {
    stop("Failed to fetch data from Linear API. Status code: ", status_code(response))
  }
  parsed_response <- content(response, "parsed")
  teams <- parsed_response$data$teams$nodes
  if (length(teams) != 1) {
    stop("Expected exactly one team, but found ", length(teams))
  }
  team_name <- teams[[1]]$name
  team_id <- teams[[1]]$id
  res <- list()
  res$id <- team_id
  res$name <- team_name
  return(res)
}
GetRecentObj <- function(objects) {
  # 現在の日付を取得
  current_date <- Sys.Date()
  # 1ヶ月前の日付を計算
  one_month_ago <- current_date - months(1)
  # 1ヶ月以内に最終更新されたオブジェクトをフィルタリング
  recent_objects <- objects %>%
    filter(LastModified >= one_month_ago)
  for (i in 1:nrow(recent_objects)) {
    if (str_detect(recent_objects[i, "Key"], str_c("^", kMeddraAwsParentDirName))){
      recent_objects[i, "category"] <- kMeddraAwsParentDirName
    } else if (str_detect(recent_objects[i, "Key"], str_c("^", kAwsParentDirName))) {
      recent_objects[i, "category"] <- kAwsParentDirName
    } else {
      recent_objects[i, "category"] <- NA
    }
    recent_objects[i, "version"] <- str_split(recent_objects[i, "Key"], "/") %>% unlist() %>% .[2]
  }
  return(recent_objects)
}
GetVersions <- function(recent_objects) {
  versions <- recent_objects %>% select("category", "version") %>% distinct()
  # バージョンチェック
  temp <- recent_objects %>% filter(str_detect(Key, str_c("^.*", kMeddraReleaseTxt, "$")))
  if (nrow(temp) == 1) {
    meddraReleasePath <- temp[1, "Key", drop=T]
    response <- get_object(bucket=kAwsBucketName, object=meddraReleasePath)
    meddraVersion <- response %>% rawToChar(response) %>% str_c(collapse="") %>% str_split_1("\\$") %>% .[1]
    temp <- versions %>% filter(category == kMeddraAwsParentDirName) %>% .[1, "version"]
    if (temp == meddraVersion) {
      print("meddra version ok.")
    } else {
      stop ("meddra version ng.")
    }
  } else {
    stop ("meddra version check error.")
  }
  versions$url <- str_c("s3://", kAwsBucketName, "/", versions$category, "/", versions$version, "/")
  return(versions)
}
EditBodies <- function() {
  title_str <- ""
  body_str <- ""
  meddra <- versions %>% filter(category == kMeddraAwsParentDirName)
  whodd <- versions %>% filter(category == kAwsParentDirName)
  if (nrow(meddra) == 1) {
    title_str <- kMeddraAwsParentDirName
    body_str <- str_c(kMeddraAwsParentDirName, " バージョン：", meddra$version)
    body_str <- body_str %>% str_c("\n", "保管先：", meddra$url)
  }
  if (nrow(filter(versions, category == kAwsParentDirName)) == 1) {
    if (nchar(title_str) > 1) {
      title_str <- title_str %>% str_c(", ")
      body_str <- body_str %>% str_c("\n")
    }
    title_str <- title_str %>% str_c(KWhoddBoxDirName)
    body_str <- body_str %>% str_c(KWhoddBoxDirName, " バージョン：", whodd$version)
    body_str <- body_str %>% str_c("\n", "保管先：", whodd$url)
  }
  if (nchar(title_str) == 0) {
    stop("no title.")
  } 
  title_str <- title_str %>% str_c("のマスターを更新したい")
  res <- list()
  res$title <- title_str
  res$description <- body_str
  return(res)
}
# ------ main ------