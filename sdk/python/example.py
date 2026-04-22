#!/usr/bin/env python3
"""
Example: Using Flowfex SDK with an AI agent

Run: python example.py
"""

from flowfex import FlowfexClient


def main():
    client = FlowfexClient('http://127.0.0.1:4000')

    # 1. Connect your agent
    print('Connecting to Flowfex...')
    session = client.connect(
        agent={'name': 'example-agent', 'type': 'assistant'},
        mode='sdk'
    )
    print(f'Connected! Session: {session.id}')

    # 2. Subscribe to real-time events
    def on_node_completed(data):
        print(f"✓ Node completed: {data.get('nodeId')}")

    client.subscribe('node:completed', on_node_completed)

    def on_approval(data):
        print(f"⏳ Node awaiting approval: {data.get('nodeId')}")
        # Auto-approve for demo
        client.approve(data['nodeId'], note='Auto-approved by example')

    client.subscribe('node:awaiting_approval', on_approval)

    # 3. Send a task
    print('\nSending task...')
    result = client.send('Summarize the key features of Python')
    print('Result:', result.get('output'))

    # 4. Get session state
    state = client.get_state()
    print('Session status:', state.get('status'))

    # 5. Cleanup
    client.disconnect()
    print('\nDisconnected.')


if __name__ == '__main__':
    main()
