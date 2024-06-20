import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import {
  faBolt,
  faCodeBranch,
  faCommentDots,
  faComments,
  faPenNib,
  faPuzzlePiece,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { FC } from "react";

type IconTitleProps = {
  icon: IconProp;
  name: string;
};

const IconTitle: FC<IconTitleProps> = ({ icon, name }) => {
  return (
    <div className="flex items-center gap-2">
      <FontAwesomeIcon icon={icon} width={16} className="size-4" /> {name}
    </div>
  );
};

const meta = {
  composition: "Composition",
  Thread: {
    title: <IconTitle icon={faComments} name="Thread" />,
  },
  Message: {
    title: <IconTitle icon={faCommentDots} name="Message" />,
  },
  Composer: {
    title: <IconTitle icon={faPenNib} name="Composer" />,
  },
  ActionBar: {
    title: <IconTitle icon={faBolt} name="ActionBar" />,
  },
  BranchPicker: {
    title: <IconTitle icon={faCodeBranch} name="BranchPicker" />,
  },
  ContentPart: {
    title: <IconTitle icon={faPuzzlePiece} name="ContentPart" />,
  },
};

export default meta;
