import { DotWorldMap } from "diagrammatic/world";

export default function TimezoneTeamsMap() {
  return (
    <DotWorldMap
      title="Support coverage by team"
      groups={{
        Americas: ["US", "CA", "MX", "BR", "AR", "CO", "CL", "PE"],
        EMEA: [
          "GB",
          "IE",
          "FR",
          "DE",
          "ES",
          "IT",
          "NL",
          "SE",
          "PL",
          "ZA",
          "NG",
          "EG",
          "AE",
          "SA",
        ],
        APAC: ["IN", "CN", "JP", "KR", "SG", "ID", "AU", "NZ", "PH", "VN"],
      }}
    />
  );
}
