"""
ClearAlert Python Sidecar — Main Entry Point
Reads JSON commands from stdin, processes files, writes JSON responses to stdout.
All processing is 100% offline.
"""
import sys
import json
import traceback

if hasattr(sys.stdin, 'reconfigure'):
    sys.stdin.reconfigure(encoding='utf-8')
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from inference import process_alerts_file


def send_response(data):
    """Send a JSON response to stdout (Electron reads this)."""
    sys.stdout.write(json.dumps(data) + '\n')
    sys.stdout.flush()


def handle_request(request):
    """Route incoming requests to the appropriate handler."""
    action = request.get('action')
    request_id = request.get('request_id', '')

    if action == 'process_file':
        filepath = request.get('filepath', '')
        try:
            # Progress: Parsing file
            send_response({
                'request_id': request_id,
                'status': 'progress',
                'percent': 10,
                'message': 'Parsing file...'
            })

            # Progress: Loading model
            send_response({
                'request_id': request_id,
                'status': 'progress',
                'percent': 30,
                'message': 'Loading ML model...'
            })

            # Run the full pipeline
            results = process_alerts_file(
                filepath,
                progress_callback=lambda pct, msg: send_response({
                    'request_id': request_id,
                    'status': 'progress',
                    'percent': pct,
                    'message': msg,
                })
            )

            # Send completed results
            send_response({
                'request_id': request_id,
                'status': 'complete',
                'data': results,
            })

        except Exception as e:
            send_response({
                'request_id': request_id,
                'status': 'error',
                'message': f'Processing error: {str(e)}',
            })
            traceback.print_exc(file=sys.stderr)

    elif action == 'ping':
        send_response({
            'request_id': request_id,
            'status': 'pong',
        })

    else:
        send_response({
            'request_id': request_id,
            'status': 'error',
            'message': f'Unknown action: {action}',
        })


def main():
    """Main loop: read JSON lines from stdin."""
    # Signal readiness
    send_response({'status': 'ready', 'message': 'ClearAlert ML engine ready'})

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
            handle_request(request)
        except json.JSONDecodeError:
            send_response({
                'status': 'error',
                'message': 'Invalid JSON received',
            })
        except Exception as e:
            send_response({
                'status': 'error',
                'message': f'Unexpected error: {str(e)}',
            })
            traceback.print_exc(file=sys.stderr)


if __name__ == '__main__':
    main()
