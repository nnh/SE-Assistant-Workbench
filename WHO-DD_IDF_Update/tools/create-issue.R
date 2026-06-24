#' title
#' description
#' @file create-issue.R
#' @author Mariko Ohtsuka
#' @date 2025.3.6
rm(list=ls())
# ------ libraries ------
library(here)
# ------ constants ------
source(here("tools", "functions", "create-issue-functions.R"),  encoding="UTF-8")
# ------ main ------
# APIキーを設定
api_key <- readline(prompt="Enter your linear API key: ")
dummy <- GetConfigText()
team <- GetTeamNameAndId(api_key)
masterUpdateLabel_id <- GetLabelId("MasterUpdate", api_key)
targetBucket <- get_bucket_df(bucket=kAwsBucketName)
recent_objects <- GetRecentObj(targetBucket)
versions <- GetVersions(recent_objects)
queryText <- EditBodies()
if (api_key != "" & team$id != "" & masterUpdateLabel_id != "" & queryText$title != "" & queryText$description != "") {
  dummy <- CreateIssue(api_key = api_key, team_id = team$id, title=queryText$title, description = queryText$description, label_id = masterUpdateLabel_id)
}
