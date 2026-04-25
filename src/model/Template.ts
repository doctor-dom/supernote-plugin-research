export class Template {
  // Template name
  public name: string;
  // Template URI for portrait orientation
  public vUri: string;
  // Template URI for landscape orientation
  public hUri: string;


}

// Note template metadata
export class NoteTemplateInfo {
 // Note background style name
  name:string;
  // MD5 for custom styles; system styles use 0
  md5:string;
}
