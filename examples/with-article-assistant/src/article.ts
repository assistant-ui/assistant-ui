// A fictional article. Every person, place and fog in it is made up.

export const article = {
  kicker: "Local Government",
  title: "The Fog of Lower Wexley Has Registered to Vote",
  dek: "After a clerical error, a coastal town's resident fog bank is on the electoral roll, has filed for a zoning variance, and appears to be winning the debate.",
  byline: "By Harriet Pennywhistle",
  dateline: "LOWER WEXLEY",
  date: "March 14, 2026",
  body: `For as long as anyone in Lower Wexley can remember, the fog has arrived at 4:15 every afternoon, rolled up Harbour Street, paused outside the bakery and settled over the town until breakfast. Residents call it Gerald. Since February, Gerald has also been a registered voter.

The registration was discovered by town clerk Marjorie Oddleigh during a routine audit of the electoral roll. Between "Gentry, Paul" and "Gilchrist, Anne" she found "Gerald (Fog), Harbour Street, no fixed elevation." The form was filled in correctly, she said, apart from the signature, which was "a sort of damp smudge."

"I checked the statute three times," Oddleigh told reporters from behind a dehumidifier. "It says any resident who has lived in the parish for five years and is not a dog may register. Gerald has lived here for at least two hundred years. Gerald is not a dog."

## A history of being ignored

Gerald is not an ordinary fog. Meteorologists at the Wexley Coastal Observatory have measured it at 1.4 kilometres wide and roughly 60 metres deep. Its temperature holds at 11 degrees Celsius whatever the season. It smells faintly of cardamom, which no scientist has explained.

"Most fog is weather," said Dr. Ines Blackwater, the observatory's only full-time staff member. "Gerald behaves more like a neighbour. It comes at the same time every day. It avoids the churchyard. It goes around the war memorial instead of through it. In 2019 it stayed away from the Henshaw wedding entirely, and the Henshaws hadn't invited it."

For decades the town accepted Gerald as part of the scenery. Tourists paid £12 for the Evening Fog Walk. The pub, The Drowned Lantern, serves a grey cocktail named after it. The parish council, however, has spent eleven years trying to get rid of it.

## The variance

The trouble began last autumn, when the council approved a 40-metre wind turbine on Pickering Hill, directly in Gerald's usual path into town. Engineers said the turbine's wake would "break up coastal fog formations within six months."

Three weeks after the approval, the planning office received an application for a zoning variance. It asked that the Pickering Hill site be reclassified as "an established fog corridor of historic character." It was printed on the office's own letterhead, and nobody remembers printing it. Under "Applicant" it said "Gerald." Under "Reason for application" it said only: "I was here first."

Councillor Desmond Fairweather, who proposed the turbine, called the application "a prank in very poor taste."

"Fog cannot fill in forms," Fairweather said at a council meeting in January. "Fog cannot hold a pen." Witnesses say that as he said this, the windows of the council chamber fogged over from the inside, and the words "CAN TOO" appeared in the condensation.

## Public opinion shifts

At first the town sided with the council. A petition to "Clear the Air" collected 312 signatures by Christmas. Then the turbine survey crew reported that their equipment kept going missing in the fog and turning up neatly stacked outside the planning office, and opinion began to change.

A poll taken by the Wexley Gazette in late February found 58 percent of residents in favour of the variance, 29 percent against, and 13 percent who said they would "rather not get involved, in case it hears."

Local baker Tobias Crumb has become Gerald's most vocal supporter. "Every morning for thirty years I've opened the shop at six, and Gerald's been there, waiting by the door," he said. "Fifteen minutes later it lifts and the bread's come out perfect. You can't get crust like that in a dry town. I've tried."

Not everyone is convinced. Retired lighthouse keeper Agnes Mooring, 91, says Gerald "has been getting ideas" since the 1970s. "It used to just sit there," she said. "Now it goes to the library. It's in there every Thursday. Nobody knows what it's reading."

## What happens next

The variance is scheduled for a public hearing on April 2. Under town rules, the applicant is entitled to speak for up to ten minutes. The council has not said how it will time a fog. Oddleigh has reserved the large hall and asked that all windows be left open.

Gerald is also eligible to vote in the May council elections, in which Fairweather is running for re-election. The ballot paper is printed on card, and the returning officer has confirmed that "a clear damp mark in one box" will count as a valid vote.

Asked whether the town was ready for a fog with political views, Oddleigh paused. "Honestly," she said, "it's the most engaged voter we've got. It turned up to every meeting this year. That's more than the councillors."

At 4:15 that afternoon the fog rolled up Harbour Street on schedule. It stopped outside the bakery. Then, for the first time anyone could remember, it carried on to the town hall and stayed there until morning.`,
};

export const articleText = [
  article.title,
  article.dek,
  `${article.byline}. ${article.dateline}, ${article.date}.`,
  article.body,
].join("\n\n");
