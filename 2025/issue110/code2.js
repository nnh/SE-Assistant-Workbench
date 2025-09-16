function test() {
  const apiEventItems = getEvents_("primary");
  const test = apiEventItems.map((item) => {
    let startTime;
    const originalStartTime = item.originalStartTime;
    if (originalStartTime !== undefined) {
      if (item.start.timezone === "UTC") {
        startTime = new Date(
          new Date(originalStartTime.dateTime).getTime() + 9 * 60 * 60 * 1000
        ).toISOString();
      } else {
        startTime = originalStartTime.dateTime;
      }
      recurrence = true;
    } else {
      if (item.start.timezone === "UTC") {
        startTime = new Date(
          new Date(item.start.dateTime).getTime() + 9 * 60 * 60 * 1000
        ).toISOString();
      } else {
        startTime = item.start.dateTime;
      }
      recurrence = false;
    }
    let allday;
    let endTime;
    if (startTime === undefined) {
      allday = true;
      startTime = new Date(item.start.date).toISOString();
      endTime = new Date(item.end.date).toISOString();
    } else {
      allday = false;
      if (item.end.timezone === "UTC") {
        endTime = new Date(
          new Date(item.end.dateTime).getTime() + 9 * 60 * 60 * 1000
        ).toISOString();
      } else {
        endTime = item.end.dateTime;
      }
    }
    if (new Date(startTime) < new Date()) {
      return null;
    }
    const organizer = item.organizer;
    const id = item.iCalUID;
    const attachments = item.attachments || [];
    const attendees = item.attendees || [];
    const description = item.description || "";
    const eventType = item.eventType;
    const title = item.summary;
    const visibility = item.visibility;
    return {
      startTime,
      endTime,
      id,
      attachments,
      recurrence,
      allday,
      attendees,
      description,
      eventType,
      title,
      visibility,
      organizer,
    };
  });
  console.log(test);
}
