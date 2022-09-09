enum ProjectStatus {
  Active,
  Finished,
}

class Project {
  constructor(
    public id: string,
    public title: string,
    public description: string,
    public people: number,
    public status: ProjectStatus
  ) {}
}

type Listener<T> = (items: T[]) => void;

///////////
//////////////////////////
/////////////////////////////////////////////////////////

class State<T> {
  protected listeners: Listener<T>[] = [];

  addListener = (listenerFn: Listener<T>) => {
    this.listeners.push(listenerFn);
  };
}

///////////
//////////////////////////
/////////////////////////////////////////////////////////
class ProjectState extends State<Project> {
  private projects: Project[] = [];
  private static instance: ProjectState;

  private constructor() {
    super();
  }

  static getInstance = () => {
    if (this.instance) {
      return this.instance;
    }

    this.instance = new ProjectState();
    return this.instance;
  };

  addProject = (title: string, description: string, numberOfPeople: number) => {
    const newProject = new Project(
      Math.random().toString(),
      title,
      description,
      numberOfPeople,
      ProjectStatus.Active
    );

    this.projects.push(newProject);
    for (const listenerFn of this.listeners) {
      listenerFn(this.projects.slice());
    }
  };
}

const projectState = ProjectState.getInstance();

interface Validatable {
  value: string | number;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

const validate = (validatableInput: Validatable) => {
  let isValid = true;

  if (validatableInput.required) {
    isValid = isValid && validatableInput.value.toString().trim().length !== 0;
  }

  if (
    validatableInput.minLength != null &&
    typeof validatableInput.value === "string"
  ) {
    isValid =
      isValid && validatableInput.value.length > validatableInput.minLength;
  }
  if (
    validatableInput.maxLength != null &&
    typeof validatableInput.value === "string"
  ) {
    isValid =
      isValid && validatableInput.value.length < validatableInput.maxLength;
  }

  if (
    validatableInput.min != null &&
    typeof validatableInput.value == "number"
  ) {
    isValid = isValid && validatableInput.value > validatableInput.min;
  }
  if (
    validatableInput.max != null &&
    typeof validatableInput.value == "number"
  ) {
    isValid = isValid && validatableInput.value < validatableInput.max;
  }

  return isValid;
};

const autoBind = (_: any, _2: string, descriptor: PropertyDescriptor) => {
  const originalMethod = descriptor.value;
  const adjDescriptor: PropertyDescriptor = {
    configurable: true,
    get() {
      const boundFn = originalMethod.bind(this);
      return boundFn;
    },
  };

  return adjDescriptor;
};

///////////
//////////////////////////
/////////////////////////////////////////////////////////
abstract class Component<T extends HTMLElement, U extends HTMLElement> {
  templateElement: HTMLTemplateElement;
  hostElement: T;
  element: U;
  constructor(
    templateId: string,
    hostElementId: string,
    insertAtStart: boolean,
    newElementId?: string
  ) {
    this.templateElement = document.getElementById(
      templateId
    ) as HTMLTemplateElement;
    this.hostElement = document.getElementById(hostElementId) as T;

    const importedNode = document.importNode(
      this.templateElement.content,
      true
    );

    this.element = importedNode.firstElementChild as U;

    if (newElementId) this.element.id = newElementId;

    this.attach(insertAtStart);
  }

  private attach = (insertAtBeginning: boolean) => {
    this.hostElement.insertAdjacentElement(
      insertAtBeginning ? "afterbegin" : "beforeend",
      this.element
    );
  };

  abstract configure(): void;
  abstract renderContent(): void;
}

///////////
//////////////////////////
////////////////////////////////////////

class ProjectItem extends Component<HTMLUListElement, HTMLLIElement> {
  private project: Project;

  get persons() {
    if (this.project.people === 1) {
      return "1 Person";
    } else {
      return `${this.project.people} persons`;
    }
  }

  constructor(hostId: string, project: Project) {
    super("single-project", hostId, false, project.id);
    this.project = project;

    this.configure();
    this.renderContent();
  }

  configure = (): void => {};

  renderContent = (): void => {
    this.element.querySelector("h2")!.textContent = this.project.title;
    this.element.querySelector("h3")!.textContent =
      this.persons + "Persons assingend.";
    this.element.querySelector("p")!.textContent = this.project.description;
  };
}

///////////
//////////////////////////
////////////////////////////////////////
class ProjectList extends Component<HTMLDivElement, HTMLElement> {
  aasignedProjects: Project[] = [];

  constructor(private type: "active" | "finished ") {
    super("project-list", "app", false, `${type}-projects`);

    this.aasignedProjects = [];

    this.configure();
    this.renderContent();
  }

  configure = (): void => {
    projectState.addListener((projects: Project[]) => {
      const relevantProjects = projects.filter((prj) => {
        if (this.type === "active") {
          return prj.status === ProjectStatus.Active;
        }

        return prj.status === ProjectStatus.Finished;
      });
      this.aasignedProjects = relevantProjects;

      this.renderProjects();
    });
  };

  renderProjects = () => {
    const listEl = document.getElementById(
      `${this.type}-projects-list`
    )! as HTMLUListElement;
    listEl.innerHTML = "";
    for (const prjItem of this.aasignedProjects) {
      new ProjectItem(this.element.querySelector("ul")!.id, prjItem);
    }
  };

  addProject = () => {};

  renderContent = () => {
    const listId = `${this.type}-projects-list`;
    this.element.querySelector("ul")!.id = listId;
    this.element.querySelector("h2")!.textContent =
      this.type.toUpperCase() + "Projects";
  };
}

///////////
//////////////////////////
//////////////////////////////
class ProjectInput extends Component<HTMLDivElement, HTMLFormElement> {
  titleInputElement: HTMLInputElement;
  descriptionInputElement: HTMLInputElement;
  peopleInputElement: HTMLInputElement;

  constructor() {
    super("project-input", "app", true, "user-input");

    this.titleInputElement = this.element.querySelector(
      "#title"
    ) as HTMLInputElement;
    this.descriptionInputElement = this.element.querySelector(
      "#description"
    ) as HTMLInputElement;
    this.peopleInputElement = this.element.querySelector(
      "#people"
    ) as HTMLInputElement;

    this.configure();
  }

  configure = (): void => {
    this.element.addEventListener("submit", this.submitHandler.bind(this));
  };

  renderContent = (): void => {};

  private gatherUserInput = (): [string, string, number] | void => {
    const enteredTitle = this.titleInputElement.value;
    const enteredDescription = this.descriptionInputElement.value;
    const enteredPeople = this.peopleInputElement.value;

    const titleValidatable: Validatable = {
      value: enteredTitle,
      required: true,
    };
    const descriptionValidatable: Validatable = {
      value: enteredDescription,
      required: true,
      minLength: 5,
    };
    const peopleValidatable: Validatable = {
      value: enteredPeople,
      required: true,
      max: 5,
      min: 2,
    };

    if (
      validate(titleValidatable) &&
      validate(descriptionValidatable) &&
      validate(peopleValidatable)
    ) {
      alert("try again :(");
    } else {
      return [enteredTitle, enteredDescription, +enteredPeople];
    }
  };

  private clearInputs = () => {
    this.titleInputElement.value = "";
    this.peopleInputElement.value = "";
    this.descriptionInputElement.value = "";
  };

  @autoBind
  private submitHandler(event: Event) {
    event.preventDefault();
    const userInput = this.gatherUserInput();
    if (Array.isArray(userInput)) {
      const [title, desc, people] = userInput;
      console.log(title, desc, people);
      projectState.addProject(title, desc, people);
      +this.clearInputs();
    }
  }
}

const prjInput = new ProjectInput();
const activeProjectList = new ProjectList("active");
const finishedProjectList = new ProjectList("finished ");
