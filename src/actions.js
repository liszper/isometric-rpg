import * as THREE from 'three';

export class ContextMenu {
    constructor(player, world) {
        this.player = player;
        this.world = world;
        this.menu = this.createMenuElement();
        this.subMenu = this.createMenuElement('sub-menu');
        
        this.setupEventListeners();
        
        this.actionHandlers = this.initializeActionHandlers();
        this.objectActions = this.initializeObjectActions();
    }

    createMenuElement(className = 'context-menu') {
        const menu = document.createElement('div');
        menu.className = className;
        menu.style.display = 'none';
        document.body.appendChild(menu);
        return menu;
    }

    setupEventListeners() {
        document.addEventListener('click', this.hide.bind(this));
        this.menu.addEventListener('mouseleave', () => {
            setTimeout(() => this.hideSubMenu(), 300);
        });
    }

    initializeActionHandlers() {
        return {
            'Walk here': this.onWalkHere.bind(this),
            'Examine': this.onExamine.bind(this),
            'Talk to': this.onTalkTo.bind(this),
            'Chop down': this.onChopTree.bind(this),
            'Mine': this.onMineRock.bind(this),
            'Use': this.onUse.bind(this),
        };
    }

    initializeObjectActions() {
        return {
            'default': ['Walk here', 'Examine'],
            'npc': ['Talk to'],
            'tree': ['Chop down'],
            'rock': ['Mine'],
            'item': ['Use', 'Drop'],
        };
    }

    show(x, y, worldPosition, objectType, clickedObject) {
        this.worldPosition = worldPosition;
        this.objectType = objectType;
        this.clickedObject = clickedObject;

        this.menu.innerHTML = '';
        this.hideSubMenu();

        const actions = [...this.objectActions['default'], ...(this.objectActions[objectType] || [])];
        actions.forEach(action => this.addMenuItem(action));

        this.positionMenu(this.menu, x, y);
    }

    addMenuItem(action) {
        const item = document.createElement('div');
        item.className = 'context-menu-item';
        item.textContent = action;

        if (action === 'Use') {
            item.addEventListener('mouseenter', (e) => this.showUseSubMenu(e));
        } else {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.executeAction(action);
                this.hide();
            });
        }

        this.menu.appendChild(item);
    }

    showUseSubMenu(event) {
        const inventory = this.player.inventory;
        this.subMenu.innerHTML = '';
        
        inventory.forEach(item => {
            const subMenuItem = document.createElement('div');
            subMenuItem.className = 'context-menu-item';
            subMenuItem.textContent = item.name;
            subMenuItem.addEventListener('click', (e) => {
                e.stopPropagation();
                this.onUse(item, this.clickedObject);
                this.hide();
            });
            this.subMenu.appendChild(subMenuItem);
        });

        this.positionMenu(this.subMenu, event.clientX + 5, event.clientY);
    }

    positionMenu(menu, x, y) {
        menu.style.display = 'block';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;

        const rect = menu.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        if (rect.right > windowWidth) {
            menu.style.left = `${windowWidth - rect.width}px`;
        }
        if (rect.bottom > windowHeight) {
            menu.style.top = `${windowHeight - rect.height}px`;
        }
    }

    hide() {
        this.menu.style.display = 'none';
        this.hideSubMenu();
    }

    hideSubMenu() {
        this.subMenu.style.display = 'none';
    }

    executeAction(action) {
        if (this.actionHandlers[action]) {
            this.actionHandlers[action](this.clickedObject);
        }
    }

    onWalkHere() {
        this.player.setDestination(this.worldPosition);
    }

    onExamine(object) {
        this.player.setDestination(this.worldPosition);
        const onReachDestination = () => {
            if (!this.player.isMoving) {
                // Implement examination logic here
                this.player.removeEventListener('reachedDestination', onReachDestination);
            }
        };
        this.player.addEventListener('reachedDestination', onReachDestination);
    }

    onTalkTo(npc) {
        this.player.setDestination(this.worldPosition);
        const onReachDestination = () => {
            if (!this.player.isMoving) {
                // Implement NPC dialogue logic here
                this.player.removeEventListener('reachedDestination', onReachDestination);
            }
        };
        this.player.addEventListener('reachedDestination', onReachDestination);
    }

    onChopTree(tree) {
        this.player.setDestination(this.worldPosition);
        const onReachDestination = () => {
            if (!this.player.isMoving) {
                // Implement tree chopping logic here
                this.player.removeEventListener('reachedDestination', onReachDestination);
            }
        };
        this.player.addEventListener('reachedDestination', onReachDestination);
    }

    onMineRock(rock) {
        this.player.setDestination(this.worldPosition);
        const onReachDestination = () => {
            if (!this.player.isMoving) {
                // Implement rock mining logic here
                this.player.removeEventListener('reachedDestination', onReachDestination);
            }
        };
        this.player.addEventListener('reachedDestination', onReachDestination);
    }

    onUse(item, target) {
        // Implement use logic here
    }
}