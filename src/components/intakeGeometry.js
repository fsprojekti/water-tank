import config from "../config";

//Intake pipe end on the scheme [Px]: the straight pipe in the image ends at endPx, the elbow turns down to outletPx
export const intakePipe = {endPx: 527, topPx: 194.1, bottomPx: 236.9, darkTopPx: 226.3, outletPx: 261, innerRadius: 21.8};

//Elbow centre x [Px] after the straight extension into the tank
export const intakeElbowPx = intakePipe.endPx + config.intake.pipeExtensionPx;

//Left edge and top of the intake outlet [Px], where the stream starts
export const intakeOutletLeftPx = intakeElbowPx + intakePipe.innerRadius;
export const intakeOutletTopPx = intakePipe.outletPx;
