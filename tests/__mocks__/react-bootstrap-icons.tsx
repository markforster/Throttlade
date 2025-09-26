import React from 'react';

function makeIcon(name: string) {
  const Icon: React.FC<{ size?: number; className?: string } & Record<string, any>> = (props) => (
    <span data-mock-icon={name} {...props} />
  );
  Icon.displayName = name;
  return Icon;
}

export const Download = makeIcon('Download');
export const Upload = makeIcon('Upload');
export const ArrowRepeat = makeIcon('ArrowRepeat');
export const PatchCheck = makeIcon('PatchCheck');
export const FileX = makeIcon('FileX');

// Extras (not used in util tests but safe to mock if imported elsewhere)
export const Plus = makeIcon('Plus');
export const Trash3 = makeIcon('Trash3');
export const ExclamationTriangleFill = makeIcon('ExclamationTriangleFill');
export const Power = makeIcon('Power');
export const QuestionCircle = makeIcon('QuestionCircle');
export const FunnelFill = makeIcon('FunnelFill');
export const Asterisk = makeIcon('Asterisk');
export const BracesAsterisk = makeIcon('BracesAsterisk');
export const CodeSlash = makeIcon('CodeSlash');
export const Pencil = makeIcon('Pencil');

